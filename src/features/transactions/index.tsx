import { useEffect, useState, useCallback } from 'react'
import { useSwipeable } from 'react-swipeable'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { PeriodAnalytics } from './components/period-analytics'
import { PeriodCalendar } from './components/period-calendar'
import { PeriodChip } from './components/period-chip'
import { LedgerTabs, type LedgerTab } from './components/ledger-tabs'
import { transactionsService } from '@/services/transactions.service'
import { payPeriodsService } from '@/services/pay-periods.service'
import { accountsService } from '@/services/accounts-categories.service'
import { debtsService } from '@/services/debts.service'
import { toISODate } from '@/lib/helpers'
import { onTransactionsChanged } from '@/lib/transactions-bus'
import type { TransactionWithDetails, PayPeriod } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'

const TABS: LedgerTab[] = ['calendar', 'analytics']

export default function TransactionsPage() {
    const [activeTab, setActiveTab] = useState<LedgerTab>('calendar')
    const [allPeriods, setAllPeriods] = useState<PayPeriod[]>([])
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(0)
    const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
    const [previousSummary, setPreviousSummary] = useState<{ income: number; expense: number; net: number } | null>(null)
    const [totalBalance, setTotalBalance] = useState(0)
    const [totalDebt, setTotalDebt] = useState(0)
    const [loading, setLoading] = useState(true)
    const [txLoading, setTxLoading] = useState(false)
    const [periodPickerOpen, setPeriodPickerOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const today = toISODate()

    const selectedPeriod = allPeriods[selectedPeriodIndex] ?? null
    const isCurrentPeriod = selectedPeriod?.id === activePeriod?.id

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

    const loadBalanceAndDebt = useCallback(async () => {
        const [{ data: accounts }, { data: debts }] = await Promise.all([
            accountsService.getAll(),
            debtsService.getActive(),
        ])
        setTotalBalance((accounts ?? []).reduce((s, a) => s + a.balance, 0))
        setTotalDebt((debts ?? []).reduce((s, d) => s + d.remaining_amount, 0))
    }, [])

    const init = useCallback(async () => {
        setLoading(true)
        const [{ data: active }, { data: all }] = await Promise.all([
            payPeriodsService.getActive(),
            payPeriodsService.getAll(),
        ])
        setActivePeriod(active)

        const periods = all ?? []
        setAllPeriods(periods)

        const defaultIndex = active ? periods.findIndex(p => p.id === active.id) : 0
        const idx = defaultIndex >= 0 ? defaultIndex : 0
        setSelectedPeriodIndex(idx)

        const defaultPeriod = periods[idx] ?? null
        if (defaultPeriod) {
            const { data: txs } = await transactionsService.getByPeriod(defaultPeriod.id)
            setTransactions(txs ?? [])
        }
        await loadBalanceAndDebt()
        setLoading(false)
    }, [loadBalanceAndDebt])

    useEffect(() => { init() }, [init])

    const loadTransactions = useCallback(async (period: PayPeriod) => {
        setTxLoading(true)
        const { data: txs } = await transactionsService.getByPeriod(period.id)
        setTransactions(txs ?? [])
        setTxLoading(false)
    }, [])

    useEffect(() => {
        return onTransactionsChanged(() => {
            if (isCurrentPeriod && activePeriod) loadTransactions(activePeriod)
            loadBalanceAndDebt()
        })
    }, [isCurrentPeriod, activePeriod, loadTransactions, loadBalanceAndDebt])

    useEffect(() => {
        const prevPeriod = allPeriods[selectedPeriodIndex + 1]
        if (!prevPeriod) {
            setPreviousSummary(null)
            return
        }
        transactionsService.getPeriodSummary(prevPeriod.id).then(({ data }) => {
            setPreviousSummary(data)
        })
    }, [selectedPeriodIndex, allPeriods])

    const handleDeleteConfirm = async () => {
        if (!deletingId) return
        setDeleteLoading(true)
        const { error } = await transactionsService.remove(deletingId)
        setDeleteLoading(false)
        if (error) { toast.error(error); return }
        setTransactions(prev => prev.filter(t => t.id !== deletingId))
        setDeletingId(null)
        toast.success('Transaction deleted.')
    }

    const calendarDefaultDate = isCurrentPeriod ? today : selectedPeriod?.start_date

    return (
        <>
            <header className="flex flex-col gap-[14px] px-5 pt-[22px] bg-neutral-50 dark:bg-neutral-950">
                <div className="flex items-center justify-between">
                    <span className="text-[20px] font-semibold tracking-[-0.02em]">Ledger.</span>
                    {selectedPeriod && (
                        <PeriodChip period={selectedPeriod} onClick={() => setPeriodPickerOpen(true)} />
                    )}
                </div>
                {!loading && selectedPeriod && (
                    <LedgerTabs active={activeTab} onChange={setActiveTab} />
                )}
            </header>

            <section className="px-4 pb-4 pt-3.5 space-y-4">
                {loading ? (
                    <LoadingContent />
                ) : !selectedPeriod ? (
                    <section className="rounded-2xl border border-neutral-200 bg-card p-4 flex items-center gap-3">
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold">No active periods</h2>
                            <p className="text-sm text-muted-foreground">Start by creating a pay period to track your transactions.</p>
                        </div>
                    </section>
                ) : txLoading ? (
                    <LoadingContent />
                ) : (
                    <section {...swipeHandlers}>
                        {activeTab === 'calendar' ? (
                            <PeriodCalendar
                                transactions={transactions}
                                periodStart={selectedPeriod.start_date}
                                periodEnd={selectedPeriod.end_date ?? today}
                                defaultDate={calendarDefaultDate}
                                onDeleteRequest={isCurrentPeriod ? setDeletingId : undefined}
                                readOnly={!isCurrentPeriod}
                            />
                        ) : (
                            <PeriodAnalytics
                                transactions={transactions as (typeof transactions[0] & { type: 'expense' | 'income' })[]}
                                period={selectedPeriod}
                                previousSummary={previousSummary}
                                totalBalance={totalBalance}
                                totalDebt={totalDebt}
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

            <ConfirmDrawer
                open={!!deletingId}
                title="Delete Transaction"
                description="Delete this transaction? This will also update your account balance."
                confirmLabel="Delete"
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                onClose={() => setDeletingId(null)}
            />
        </>
    )
}
