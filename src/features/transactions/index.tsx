import { useEffect, useState } from 'react'
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
import { getDaysBetween, toISODate } from '@/lib/helpers'
import { queryClient } from '@/lib/query-client'
import { queryKeys, usePeriodTransactions } from '@/queries'
import { useSelectedPeriod } from '@/stores/period-store'
import type { TransactionWithDetails } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'

const TABS: LedgerTab[] = ['calendar', 'all']
const EMPTY_TXS: TransactionWithDetails[] = []

export default function TransactionsPage() {
    const [activeTab, setActiveTab] = useState<LedgerTab>('calendar')
    // Shared with Overview: the period picked there is the one shown here, and back.
    const {
        periods: allPeriods,
        activePeriod,
        selectedPeriod,
        isActivePeriod: isCurrentPeriod,
        isPending: loading,
        error: periodsError,
        selectPeriod,
    } = useSelectedPeriod()
    const txQuery = usePeriodTransactions(selectedPeriod?.id)
    const transactions = txQuery.data ?? EMPTY_TXS
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

    // An open period has no end date yet, so its length is estimated from the one before
    // (periods are sorted newest first) — the same estimate the dashboard uses.
    const selectedPeriodIndex = selectedPeriod ? allPeriods.findIndex(p => p.id === selectedPeriod.id) : -1
    const prevPeriod = selectedPeriodIndex >= 0 ? allPeriods[selectedPeriodIndex + 1] ?? null : null
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

    // Refetches after a write keep the current view mounted (no loader), so the calendar
    // keeps its selected day. Only a period with nothing cached yet shows a loader.
    const txLoading = !!selectedPeriod && txQuery.isPending

    useEffect(() => {
        if (periodsError) toast.error(periodsError.message)
    }, [periodsError])
    useEffect(() => {
        if (txQuery.error) toast.error(txQuery.error.message)
    }, [txQuery.error])

    // A new period, or rows that are gone after a refetch: drop their selections.
    useEffect(() => {
        const ids = new Set(transactions.map(t => t.id))
        setSelectedIds(prev => prev.some(id => !ids.has(id)) ? prev.filter(id => ids.has(id)) : prev)
    }, [transactions])

    /** Take rows off screen now; the refetch that follows the delete confirms it. */
    const removeFromCache = (ids: string[]) => {
        if (!selectedPeriod) return
        queryClient.setQueryData<TransactionWithDetails[]>(
            queryKeys.transactions(selectedPeriod.id),
            prev => prev?.filter(t => !ids.includes(t.id)),
        )
    }

    const handleDeleteConfirm = async () => {
        if (!deletingId) return
        const removed = transactions.find(t => t.id === deletingId)
        setDeleteLoading(true)
        const { error } = await transactionsService.remove(deletingId)
        setDeleteLoading(false)
        if (error) { toast.error(error); return }
        removeFromCache([deletingId])
        setDeletingId(null)
        toast.success('Transaction deleted.', removed ? {
            action: {
                label: 'Undo',
                onClick: async () => {
                    const { error: restoreError } = await transactionsService.restore(removed)
                    if (restoreError) { toast.error(restoreError); return }
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
        removeFromCache(selectedIds)
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
                    selectPeriod(period)
                    setSelectedIds([])
                    setPeriodPickerOpen(false)
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
                    onSuccess={() => setEditingTx(null)}
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
