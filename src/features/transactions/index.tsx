import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { PeriodCalendar } from './components/period-calendar'
import { PeriodChip } from './components/period-chip'
import { TransactionListView } from './components/transaction-list-view'
import { BulkCategoryDrawer } from './components/bulk-category-drawer'
import { TransactionDetail } from './components/transaction-detail'
import { AddTransactionFlow } from './components/add-transaction-flow'
import { dailyAllowance, linkedTo, type LedgerView } from './lib/ledger'
import { useIsDesktop } from './lib/use-is-desktop'
import { BottomDrawer } from '@/components/bottom-drawer'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { transactionsService } from '@/services/transactions.service'
import { getDaysBetween, toISODate } from '@/lib/helpers'
import { queryClient } from '@/lib/query-client'
import { queryKeys, usePeriodTransactions } from '@/queries'
import { useSelectedPeriod } from '@/stores/period-store'
import type { TransactionWithDetails } from '@/types'
import { toast } from 'sonner'
import { CalendarDays, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LedgerSkeleton } from './components/ledger-skeleton'

const EMPTY_TXS: TransactionWithDetails[] = []
const VIEW_KEY = 'mouny.ledgerView'

const plural = (n: number) => `${n} transaction${n === 1 ? '' : 's'}`

function readView(): LedgerView {
    try {
        return localStorage.getItem(VIEW_KEY) === 'calendar' ? 'calendar' : 'list'
    } catch {
        return 'list'
    }
}

function saveView(view: LedgerView) {
    // Private browsing can refuse storage; the view just isn't remembered then.
    try { localStorage.setItem(VIEW_KEY, view) } catch { /* not remembered */ }
}

export default function TransactionsPage() {
    // The list (with search) first; the calendar is one tap away, and remembered.
    const [view, setView] = useState<LedgerView>(readView)
    // Shared with Overview: the period picked there is the one shown here, and back.
    const {
        periods: allPeriods,
        activePeriod,
        selectedPeriod,
        isActivePeriod: isCurrentPeriod,
        isPending: loading,
        selectPeriod,
    } = useSelectedPeriod()
    const txQuery = usePeriodTransactions(selectedPeriod?.id)
    const transactions = txQuery.data ?? EMPTY_TXS
    const [periodPickerOpen, setPeriodPickerOpen] = useState(false)
    // By id, so the detail follows a refetch (an edit) and goes away with a delete.
    const [openId, setOpenId] = useState<string | null>(null)
    const openTx = openId ? transactions.find(t => t.id === openId) ?? null : null
    const setOpenTx = (tx: TransactionWithDetails | null) => setOpenId(tx?.id ?? null)
    const [editingTx, setEditingTx] = useState<TransactionWithDetails | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
    const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false)
    const [bulkCategoryLoading, setBulkCategoryLoading] = useState(false)
    // A wide screen shows the detail in a panel beside the list; a phone, in a sheet.
    const isDesktop = useIsDesktop()

    const today = toISODate()
    const topBarSlotNode = useTopBarSlotNode()
    const location = useLocation()
    const navigate = useNavigate()

    // An account's "Ledger" link narrows the list to that account, until the chip is cleared.
    const [accountId, setAccountId] = useState<string | null>(null)

    // Home opens a transaction here through the navigation state: its period first, then
    // the row once that period's transactions have loaded. An account's link sends its id.
    useEffect(() => {
        const want = location.state as { openId?: string; periodId?: string; accountId?: string } | null
        if (want?.accountId) {
            setAccountId(want.accountId)
            setView('list')
            navigate(location.pathname, { replace: true, state: null })
            return
        }
        if (!want?.openId) return
        if (want.periodId && selectedPeriod && selectedPeriod.id !== want.periodId) {
            const period = allPeriods.find(p => p.id === want.periodId)
            if (period) { selectPeriod(period); return }
        }
        if (!txQuery.data) return
        if (txQuery.data.some(t => t.id === want.openId)) setOpenId(want.openId)
        navigate(location.pathname, { replace: true, state: null })
    }, [location.state, location.pathname, navigate, selectedPeriod, allPeriods, selectPeriod, txQuery.data])

    // An open period has no end date yet, so its length is estimated from the one before
    // (periods are sorted newest first) — the same estimate the dashboard uses.
    const selectedPeriodIndex = selectedPeriod ? allPeriods.findIndex(p => p.id === selectedPeriod.id) : -1
    const prevPeriod = selectedPeriodIndex >= 0 ? allPeriods[selectedPeriodIndex + 1] ?? null : null
    const fallbackTotalDays = prevPeriod?.end_date
        ? getDaysBetween(prevPeriod.start_date, prevPeriod.end_date) + 1
        : null
    const billReserve = useBillReserve(selectedPeriod, transactions)
    const stats = usePeriodStats({
        period: selectedPeriod ?? { start_date: today, end_date: null },
        transactions,
        fallbackTotalDays,
        reservedBills: billReserve.reserved,
    })
    // The period's fixed everyday share: what each day's everyday spending is held against.
    const allowance = dailyAllowance(stats)

    const toggleView = () => {
        const next = view === 'calendar' ? 'list' : 'calendar'
        setView(next)
        saveView(next)
    }

    // Refetches after a write keep the current view mounted (no loader), so the calendar
    // keeps its selected day. Only a period with nothing cached yet shows a loader.
    const txLoading = !!selectedPeriod && txQuery.isPending
    // No rows to show at all: an empty ledger would look like real data.
    const txFailed = !!selectedPeriod && txQuery.isError && !txQuery.data

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
        // Deleting a linked row also changed its transfer, debt or wish, and putting the
        // row back wouldn't undo that, so only plain transactions get an Undo.
        toast.success('Transaction deleted.', removed && !linkedTo(removed) ? {
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
    const linkedSelected = selectedTxs.filter(t => linkedTo(t)).length
    // Categories belong to income or expenses; transfers have none to change.
    const commonType = new Set(selectedTxs.map(t => t.type)).size === 1 ? selectedTxs[0]?.type ?? null : null
    const commonSelectedType = commonType === 'income' || commonType === 'expense' ? commonType : null

    const handleBulkDeleteConfirm = async () => {
        setBulkDeleteLoading(true)
        const { error } = await transactionsService.removeMany(selectedIds)
        setBulkDeleteLoading(false)
        if (error) { toast.error(error); return }
        removeFromCache(selectedIds)
        setSelectedIds([])
        setBulkDeleteOpen(false)
        toast.success(`${plural(selectedIds.length)} deleted.`)
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

    // The account filter: its rows, and both sides of any transfer it took part in, so the
    // list still shows "BCA → GoPay" once.
    const accountTransfers = accountId
        ? new Set(transactions.filter(t => t.account_id === accountId && t.transfer_id).map(t => t.transfer_id))
        : null
    const listTransactions = accountId
        ? transactions.filter(t => t.account_id === accountId || (t.transfer_id && accountTransfers!.has(t.transfer_id)))
        : transactions
    const accountName = accountId ? transactions.find(t => t.account_id === accountId)?.account.name ?? 'This account' : null

    const calendarDefaultDate = isCurrentPeriod ? today : selectedPeriod?.start_date

    // Each action closes the detail and hands off.
    const detail = openTx && (
        <TransactionDetail
            tx={openTx}
            readOnly={!isCurrentPeriod}
            onEdit={() => { setEditingTx(openTx); setOpenTx(null) }}
            onDelete={() => { setDeletingId(openTx.id); setOpenTx(null) }}
            onMoved={() => setOpenTx(null)}
        />
    )

    const calendarToggle = (size: 'sm' | 'md') => selectedPeriod && !loading && (
        <button
            type="button"
            onClick={toggleView}
            aria-pressed={view === 'calendar'}
            aria-label="Calendar view"
            title={view === 'calendar' ? 'Back to the list' : 'Calendar'}
            className={cn(
                'border flex items-center justify-center shrink-0 transition-colors',
                size === 'sm' ? 'w-9 h-9 rounded-[10px]' : 'w-10 h-10 rounded-[12px]',
                view === 'calendar' ? 'bg-ink border-ink text-on-ink' : 'bg-surface border-line text-ink hover:bg-surface-soft',
            )}
        >
            <CalendarDays aria-hidden="true" className="w-[18px] h-[18px]" />
        </button>
    )

    return (
        <>
            {/* Wide screens: the top bar already names the page, so the period and the
                calendar toggle sit in it and the page's own header goes away. */}
            {topBarSlotNode && selectedPeriod && createPortal(
                <>
                    <PeriodChip period={selectedPeriod} onClick={() => setPeriodPickerOpen(true)} />
                    {calendarToggle('sm')}
                </>,
                topBarSlotNode
            )}

            <header className="flex items-center justify-between gap-3 px-5 pt-[22px] lg:hidden">
                <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Ledger</h1>
                <div className="flex items-center gap-2">
                    {selectedPeriod && <PeriodChip period={selectedPeriod} onClick={() => setPeriodPickerOpen(true)} />}
                    {calendarToggle('md')}
                </div>
            </header>

            <section className="px-4 pb-4 pt-4 lg:px-0">
                {loading ? (
                    <LedgerSkeleton />
                ) : !selectedPeriod ? (
                    <div className="card p-6 text-center">
                        <p className="text-[16px] font-medium tracking-[-0.01em] text-ink">No pay period yet</p>
                        <p className="mt-1 text-[12px] text-muted-ink leading-relaxed max-w-[300px] mx-auto">
                            Start a pay period when your salary comes in. Every transaction you add lands in it, and Mouny tracks what’s left each day.
                        </p>
                    </div>
                ) : txLoading ? (
                    <LedgerSkeleton />
                ) : txFailed ? (
                    <div role="alert" className="card p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[13px] font-medium text-ink">Couldn't load this period's transactions.</p>
                            <p className="text-[11.5px] text-muted-ink mt-1">Check your connection and try again.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => { void txQuery.refetch() }}
                            disabled={txQuery.isFetching}
                            className="shrink-0 h-9 min-w-[76px] rounded-[10px] bg-action px-4 text-[12.5px] font-semibold text-on-action transition-colors hover:bg-action/90 disabled:opacity-70"
                        >
                            {txQuery.isFetching ? <Loader2 aria-label="Retrying" className="w-4 h-4 animate-spin mx-auto" /> : 'Retry'}
                        </button>
                    </div>
                ) : (
                    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
                        <div className="min-w-0">
                            {view === 'calendar' ? (
                                <PeriodCalendar
                                    key={selectedPeriod.id}
                                    transactions={transactions}
                                    periodStart={selectedPeriod.start_date}
                                    periodEnd={selectedPeriod.end_date ?? today}
                                    defaultDate={calendarDefaultDate}
                                    onDeleteRequest={isCurrentPeriod ? setDeletingId : undefined}
                                    onOpen={setOpenTx}
                                    openId={isDesktop ? openId : null}
                                    allowance={allowance}
                                    periodIncome={stats.totalIncome}
                                    readOnly={!isCurrentPeriod}
                                />
                            ) : (
                                <>
                                {accountName && (
                                    <div className="pb-3">
                                        <button
                                            type="button"
                                            onClick={() => setAccountId(null)}
                                            aria-label={`Show all accounts (now ${accountName})`}
                                            className="inline-flex items-center gap-1.5 h-8 pl-3.5 pr-2.5 rounded-full bg-ink text-on-ink text-[12.5px] font-medium"
                                        >
                                            {accountName}
                                            <X aria-hidden="true" className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                                <TransactionListView
                                    transactions={listTransactions}
                                    selectedIds={selectedIds}
                                    onSelectedIdsChange={setSelectedIds}
                                    readOnly={!isCurrentPeriod}
                                    onOpen={setOpenTx}
                                    openId={isDesktop ? openId : null}
                                    onBulkDeleteRequest={() => setBulkDeleteOpen(true)}
                                    onBulkCategoryRequest={() => setBulkCategoryOpen(true)}
                                    exportName={`transactions-${selectedPeriod.start_date}.csv`}
                                />
                                </>
                            )}
                        </div>

                        {/* Wide screens: the detail stays beside the list instead of covering it */}
                        <aside aria-label="Transaction detail" className="hidden lg:block sticky top-[88px] border-l border-line pl-8 min-h-[240px]">
                            {isDesktop && detail ? (
                                <div className="relative">
                                    <button
                                        type="button"
                                        aria-label="Close detail"
                                        onClick={() => setOpenTx(null)}
                                        className="absolute -top-1 right-0 w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-muted-ink hover:text-ink transition-colors"
                                    >
                                        <X aria-hidden="true" className="w-4 h-4" />
                                    </button>
                                    {detail}
                                </div>
                            ) : (
                                <p className="pt-1 text-[13px] text-muted-ink leading-relaxed">
                                    Pick a transaction to see it in full, edit or delete it.
                                </p>
                            )}
                        </aside>
                    </div>
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

            {/* Phones: the detail as a sheet */}
            <BottomDrawer open={!!openTx && !isDesktop} onClose={() => setOpenTx(null)} title="Transaction">
                {!isDesktop && detail}
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
                description={`Delete ${plural(selectedIds.length)}? This will also update your account balance.`
                    + (linkedSelected > 0
                        // The same consequences the detail sheet spells out for one of them.
                        ? ` ${linkedSelected === selectedIds.length ? 'They are' : `${linkedSelected} of them ${linkedSelected === 1 ? 'is' : 'are'}`} linked: a transfer loses both sides, and wish list or debt entries update those too.`
                        : '')}
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
