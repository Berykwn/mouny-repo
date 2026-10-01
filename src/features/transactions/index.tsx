import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSwipeable } from 'react-swipeable'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { PeriodCalendar } from './components/period-calendar'
import { PeriodChip } from './components/period-chip'
import { LedgerTabs, type LedgerTab } from './components/ledger-tabs'
import { TransactionListView } from './components/transaction-list-view'
import { BulkCategoryDrawer } from './components/bulk-category-drawer'
import { LedgerHero } from './components/ledger-hero'
import { TransactionDetail } from './components/transaction-detail'
import { AddTransactionFlow } from './components/add-transaction-flow'
import { BottomDrawer } from '@/components/bottom-drawer'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { transactionsService } from '@/services/transactions.service'
import { payPeriodsService } from '@/services/pay-periods.service'
import { getDaysBetween, toISODate } from '@/lib/helpers'
import { onTransactionsChanged, onPeriodsChanged, emitTransactionsChanged } from '@/lib/transactions-bus'
import type { TransactionWithDetails, PayPeriod } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'

const TABS: LedgerTab[] = ['calendar', 'all']

export default function TransactionsPage() {
    const [activeTab, setActiveTab] = useState<LedgerTab>('calendar')
    const [allPeriods, setAllPeriods] = useState<PayPeriod[]>([])
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(0)
    const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
    const [loading, setLoading] = useState(true)
    const [txLoading, setTxLoading] = useState(false)
    const [periodPickerOpen, setPeriodPickerOpen] = useState(false)
    const [openTx, setOpenTx] = useState<TransactionWithDetails | null>(null)
    const [editingTx, setEditingTx] = useState<TransactionWithDetails | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
    const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false)
    const [bulkCategoryLoading, setBulkCategoryLoading] = useState(false)

    const today = toISODate()
    const topBarSlotNode = useTopBarSlotNode()

    const selectedPeriod = allPeriods[selectedPeriodIndex] ?? null
    const isCurrentPeriod = selectedPeriod?.id === activePeriod?.id

    // An open period has no end date yet, so its length is estimated from the one before
    // (periods are sorted newest first) — the same estimate the dashboard uses.
    const prevPeriod = allPeriods[selectedPeriodIndex + 1] ?? null
    const fallbackTotalDays = prevPeriod?.end_date
        ? getDaysBetween(prevPeriod.start_date, prevPeriod.end_date) + 1
        : null
    const stats = usePeriodStats({
        period: selectedPeriod ?? { start_date: today, end_date: null },
        transactions,
        fallbackTotalDays,
    })
    // The even daily share of what came in: the bar each day's spending is held against.
    const dailyLimit = stats.totalIncome > 0 && stats.totalDays ? stats.totalIncome / stats.totalDays : null

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => {
            const i = TABS.indexOf(activeTab)
            if (i < TABS.length - 1) setActiveTab(TABS[i + 1])
        },
        onSwipedRight: () => {
            const i = TABS.indexOf(activeTab)
            if (i > 0) setActiveTab(TABS[i - 1])
        },
        preventScrollOnSwipe: true,
        trackMouse: false,
        delta: 50,
    })

    // Every load bumps this; a response that comes back after a newer request is dropped,
    // so switching periods quickly can't show one period's transactions under another.
    const requestIdRef = useRef(0)

    const init = useCallback(async () => {
        const requestId = ++requestIdRef.current
        setLoading(true)
        const [{ data: active }, { data: all, error: allError }] = await Promise.all([
            payPeriodsService.getActive(),
            payPeriodsService.getAll(),
        ])
        if (requestId !== requestIdRef.current) return
        if (allError) toast.error(allError)
        setActivePeriod(active)

        const periods = all ?? []
        setAllPeriods(periods)

        const defaultIndex = active ? periods.findIndex(p => p.id === active.id) : 0
        const idx = defaultIndex >= 0 ? defaultIndex : 0
        setSelectedPeriodIndex(idx)

        const defaultPeriod = periods[idx] ?? null
        if (defaultPeriod) {
            const { data: txs, error } = await transactionsService.getByPeriod(defaultPeriod.id)
            if (requestId !== requestIdRef.current) return
            if (error) toast.error(error)
            setTransactions(txs ?? [])
        } else {
            setTransactions([])
        }
        setLoading(false)
    }, [])

    useEffect(() => { init() }, [init])
    useEffect(() => onPeriodsChanged(() => { init() }), [init])

    /**
     * `background` refreshes (after an add/edit elsewhere) keep the current view mounted,
     * so the calendar keeps its selected day instead of being rebuilt behind a loader.
     */
    const loadTransactions = useCallback(async (period: PayPeriod, { background = false } = {}) => {
        const requestId = ++requestIdRef.current
        if (!background) setTxLoading(true)
        const { data: txs, error } = await transactionsService.getByPeriod(period.id)
        if (requestId !== requestIdRef.current) return
        if (error) {
            toast.error(error)
            // A failed switch mustn't leave the previous period's rows under the new chip.
            if (!background) setTransactions([])
        } else {
            const list = txs ?? []
            setTransactions(list)
            // Drop selections for transactions that no longer exist.
            const ids = new Set(list.map(t => t.id))
            setSelectedIds(prev => prev.filter(id => ids.has(id)))
        }
        setTxLoading(false)
    }, [])

    useEffect(() => {
        return onTransactionsChanged(() => {
            if (isCurrentPeriod && activePeriod) loadTransactions(activePeriod, { background: true })
        })
    }, [isCurrentPeriod, activePeriod, loadTransactions])

    useEffect(() => {
        setSelectedIds([])
    }, [selectedPeriodIndex])

    const handleDeleteConfirm = async () => {
        if (!deletingId) return
        const removed = transactions.find(t => t.id === deletingId)
        setDeleteLoading(true)
        const { error } = await transactionsService.remove(deletingId)
        setDeleteLoading(false)
        if (error) { toast.error(error); return }
        setTransactions(prev => prev.filter(t => t.id !== deletingId))
        setDeletingId(null)
        emitTransactionsChanged()
        toast.success('Transaction deleted.', removed ? {
            action: {
                label: 'Undo',
                onClick: async () => {
                    const { error: restoreError } = await transactionsService.restore(removed)
                    if (restoreError) { toast.error(restoreError); return }
                    emitTransactionsChanged()
                    if (selectedPeriod) loadTransactions(selectedPeriod, { background: true })
                    toast.success('Transaction restored.')
                },
            },
        } : undefined)
    }

    const selectedTxs = transactions.filter(t => selectedIds.includes(t.id))
    const commonSelectedType = (new Set(selectedTxs.map(t => t.type)).size === 1
        ? selectedTxs[0]?.type ?? null
        : null) as 'income' | 'expense' | null

    const handleBulkDeleteConfirm = async () => {
        setBulkDeleteLoading(true)
        const { error } = await transactionsService.removeMany(selectedIds)
        setBulkDeleteLoading(false)
        if (error) { toast.error(error); return }
        setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)))
        setSelectedIds([])
        setBulkDeleteOpen(false)
        toast.success(`${selectedIds.length} transaction(s) deleted.`)
    }

    const handleBulkCategoryConfirm = async (categoryId: string) => {
        setBulkCategoryLoading(true)
        const { error } = await transactionsService.updateMany(selectedIds, { category_id: categoryId })
        setBulkCategoryLoading(false)
        if (error) { toast.error(error); return }
        setSelectedIds([])
        setBulkCategoryOpen(false)
        if (selectedPeriod) await loadTransactions(selectedPeriod, { background: true })
        toast.success('Category updated.')
    }

    const calendarDefaultDate = isCurrentPeriod ? today : selectedPeriod?.start_date

    return (
        <>
            {topBarSlotNode && selectedPeriod && createPortal(
                <PeriodChip period={selectedPeriod} onClick={() => setPeriodPickerOpen(true)} />,
                topBarSlotNode
            )}

            <header className="flex flex-col gap-[14px] px-5 pt-[22px] lg:px-0 lg:pt-0 bg-neutral-50 dark:bg-neutral-950">
                <div className="lg:hidden flex items-center justify-between">
                    <span className="text-[20px] font-semibold tracking-[-0.02em]">Ledger.</span>
                    {selectedPeriod && (
                        <PeriodChip period={selectedPeriod} onClick={() => setPeriodPickerOpen(true)} />
                    )}
                </div>
            </header>

            <section className="px-4 pb-4 pt-3.5 lg:px-0 space-y-4">
                {loading ? (
                    <LoadingContent />
                ) : !selectedPeriod ? (
                    <div className="card p-6 text-center">
                        <p className="text-[16px] font-medium tracking-[-0.01em] text-ink">No pay period yet</p>
                        <p className="mt-1 text-[12px] text-muted-ink leading-relaxed max-w-[300px] mx-auto">
                            Start a pay period when your salary comes in. Every transaction you add lands in it, and Mouny tracks what’s left each day.
                        </p>
                    </div>
                ) : txLoading ? (
                    <LoadingContent />
                ) : (
                    <section {...swipeHandlers} className="space-y-4">
                        <div className="lg:max-w-[856px]">
                            <LedgerHero stats={stats} />
                        </div>
                        <LedgerTabs active={activeTab} onChange={setActiveTab} />
                        {activeTab === 'calendar' ? (
                            <PeriodCalendar
                                transactions={transactions}
                                periodStart={selectedPeriod.start_date}
                                periodEnd={selectedPeriod.end_date ?? today}
                                defaultDate={calendarDefaultDate}
                                onDeleteRequest={isCurrentPeriod ? setDeletingId : undefined}
                                onOpen={setOpenTx}
                                dailyLimit={dailyLimit}
                                readOnly={!isCurrentPeriod}
                            />
                        ) : (
                            <TransactionListView
                                transactions={transactions}
                                selectedIds={selectedIds}
                                onSelectedIdsChange={setSelectedIds}
                                readOnly={!isCurrentPeriod}
                                onOpen={setOpenTx}
                                onBulkDeleteRequest={() => setBulkDeleteOpen(true)}
                                onBulkCategoryRequest={() => setBulkCategoryOpen(true)}
                            />
                        )}
                    </section>
                )}
            </section>

            <PeriodPickerDrawer
                open={periodPickerOpen}
                onClose={() => setPeriodPickerOpen(false)}
                periods={allPeriods}
                activePeriodId={activePeriod?.id}
                selectedPeriodId={selectedPeriod?.id}
                onSelect={(period) => {
                    setSelectedPeriodIndex(allPeriods.findIndex(p => p.id === period.id))
                    setPeriodPickerOpen(false)
                    loadTransactions(period)
                }}
            />

            {/* Detail sheet — each action closes it and hands off */}
            <BottomDrawer open={!!openTx} onClose={() => setOpenTx(null)} title="Transaction">
                {openTx && (
                    <TransactionDetail
                        tx={openTx}
                        readOnly={!isCurrentPeriod}
                        onEdit={() => { setEditingTx(openTx); setOpenTx(null) }}
                        onDelete={() => { setDeletingId(openTx.id); setOpenTx(null) }}
                    />
                )}
            </BottomDrawer>

            {editingTx && selectedPeriod && (
                <AddTransactionFlow
                    payPeriodId={selectedPeriod.id}
                    periodStart={selectedPeriod.start_date}
                    periodEnd={selectedPeriod.end_date ?? undefined}
                    initial={editingTx}
                    onClose={() => setEditingTx(null)}
                    onSuccess={() => {
                        setEditingTx(null)
                        emitTransactionsChanged()
                    }}
                />
            )}

            <ConfirmDrawer
                open={!!deletingId}
                title="Delete Transaction"
                description="Delete this transaction? This will also update your account balance."
                confirmLabel="Delete"
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                onClose={() => setDeletingId(null)}
            />

            <ConfirmDrawer
                open={bulkDeleteOpen}
                title="Delete Transactions"
                description={`Delete ${selectedIds.length} transaction(s)? This will also update your account balance.`}
                confirmLabel="Delete"
                loading={bulkDeleteLoading}
                onConfirm={handleBulkDeleteConfirm}
                onClose={() => setBulkDeleteOpen(false)}
            />

            <BulkCategoryDrawer
                open={bulkCategoryOpen}
                onClose={() => setBulkCategoryOpen(false)}
                type={commonSelectedType}
                loading={bulkCategoryLoading}
                onConfirm={handleBulkCategoryConfirm}
            />

        </>
    )
}
