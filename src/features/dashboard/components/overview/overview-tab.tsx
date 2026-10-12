import { useMemo } from 'react'
import { useAccounts, useDebts, usePeriods, usePeriodSummary, usePeriodTransactions } from '@/queries'
import { getDaysBetween } from '@/lib/helpers'
import { OverviewSkeleton } from './overview-skeleton'
import { OverviewData } from '@/types/overview.types'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { comparableSpending } from '@/lib/comparable-spending'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { BillsDueCard } from '@/features/bills/components/bills-due-card'
import { QuickAddCard } from '@/features/quick-transactions/components/quick-add-card'
import { SafeToSpendCard } from './safe-to-spend-card'
import { PeriodInsights } from './period-insights'
import { TodayWeekCard } from './today-week-card'
import { BalancesCard } from './balances-card'
import { SpendingByAccountCard } from './spending-by-account-card'
import { AnalyticsSection } from '../analytics/analytics-section'

/**
 * Everything the overview shows for one period, put together from the shared cache.
 * Each part refetches on its own after a write, and a failed background refetch keeps
 * the last data on screen.
 */
function useOverviewData(periodId: string): { data: OverviewData | null; loading: boolean; debtsFailed: boolean; retry: () => void } {
    const periodsQuery = usePeriods()
    const txsQuery = usePeriodTransactions(periodId)
    const accountsQuery = useAccounts()
    const debtsQuery = useDebts({ activeOnly: true })

    const allList = periodsQuery.periods
    // Periods are sorted by start_date descending, so the period immediately
    // before this one (chronologically) is the next entry in the list.
    const currentIndex = allList.findIndex(p => p.id === periodId)
    const currentPeriod = allList[currentIndex] ?? null
    const prevPeriod = currentIndex >= 0 ? allList[currentIndex + 1] ?? null : null
    const previousQuery = usePeriodSummary(prevPeriod?.id)

    const data = useMemo((): OverviewData | null => {
        const periodTxs = txsQuery.data
        const accountsList = accountsQuery.data
        // Missing data would render as a believable Rp0 period, so treat it as a failed load.
        if (!currentPeriod || !periodTxs || !accountsList) return null

        const fallbackTotalDays = prevPeriod?.start_date && prevPeriod?.end_date
            ? getDaysBetween(prevPeriod.start_date, prevPeriod.end_date) + 1
            : null

        return {
            transactions: periodTxs,
            accounts: accountsList,
            closingBalance: currentPeriod.closing_balance ?? null,
            period: currentPeriod,
            fallbackTotalDays,
            allPeriods: allList,
            previousSummary: previousQuery.data ?? null,
            totalBalance: accountsList.reduce((s, a) => s + a.balance, 0),
            // Receivables are money owed to the user, not debt. Unknown until debts load:
            // counting it as 0 would show a "No debt" health score.
            totalDebt: debtsQuery.data
                ? debtsQuery.data.filter(d => d.type === 'debt').reduce((s, d) => s + d.remaining_amount, 0)
                : null,
        }
    }, [txsQuery.data, accountsQuery.data, debtsQuery.data, previousQuery.data, currentPeriod, prevPeriod, allList])

    const loading = periodsQuery.isPending || txsQuery.isPending || accountsQuery.isPending
    const retry = () => {
        void periodsQuery.refetch()
        void txsQuery.refetch()
        void accountsQuery.refetch()
        void debtsQuery.refetch()
    }
    // Debts only feed the health score, so their failure shows there, not as a failed page.
    const debtsFailed = debtsQuery.isError && !debtsQuery.data
    return { data, loading, debtsFailed, retry }
}

export function OverviewTransaction({
    periodId,
    isActivePeriod,
}: {
    periodId: string
    isActivePeriod: boolean
}) {
    const { data, loading, debtsFailed, retry } = useOverviewData(periodId)
    const reserve = useBillReserve(data?.period, data?.transactions)

    const stats = usePeriodStats({
        period: data?.period ?? { start_date: '', end_date: null },
        transactions: data?.transactions ?? [],
        fallbackTotalDays: data?.fallbackTotalDays ?? null,
        reservedBills: reserve.reserved,
    })
    // Every "vs last period" on the overview compares this, so they can't disagree.
    const comparable = comparableSpending(stats)

    if (loading) return <OverviewSkeleton />
    if (!data) return (
        <section role='alert' className='card p-4 mt-1.5 flex items-center justify-between gap-3'>
            <div className='min-w-0'>
                <h2 className='text-[13px] font-medium text-ink'>Failed to load period data.</h2>
                <p className='text-[11.5px] text-muted-ink mt-1'>Check your connection and try again.</p>
            </div>
            <button
                type='button'
                onClick={retry}
                className='shrink-0 h-9 rounded-[10px] bg-brand px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand/90'
            >
                Retry
            </button>
        </section>
    )

    const { transactions, accounts, closingBalance } = data

    return (
        <div className="mt-1.5">
            <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start">
                <div className="space-y-3">
                    <SafeToSpendCard
                        totalIncome={stats.totalIncome}
                        totalSpending={stats.totalSpending}
                        totalSavings={stats.totalSavings}
                        remaining={stats.remaining}
                        reservedBills={stats.reservedBills}
                        unpaidBills={reserve.dues.filter(d => d.outstanding > 0).length}
                        previousSummary={data.previousSummary}
                        totalBalance={data.totalBalance}
                        balance={isActivePeriod ? data.totalBalance : (closingBalance ?? data.totalBalance)}
                        isActivePeriod={isActivePeriod}
                        totalDebt={data.totalDebt}
                        comparable={comparable}
                        debtsFailed={debtsFailed}
                        onRetry={retry}
                    />

                    {/* On mobile the bottom nav's + button already adds a transaction. */}
                    {isActivePeriod && (
                        <div className="hidden lg:block">
                            <QuickAddCard period={data.period} />
                        </div>
                    )}

                    {isActivePeriod && reserve.dues.length > 0 && (
                        <BillsDueCard dues={reserve.dues} period={data.period} />
                    )}

                    {isActivePeriod && <PeriodInsights period={data.period} transactions={transactions} stats={stats} dues={reserve.dues} />}
                </div>

                <div className="space-y-3">
                    {/* On a phone the headline card already leads with the balance. */}
                    <div className="hidden lg:block">
                        <BalancesCard
                            accounts={accounts}
                            isActivePeriod={isActivePeriod}
                            closingBalance={closingBalance}
                        />
                    </div>

                    {isActivePeriod && (
                        <TodayWeekCard
                            key={data.period.start_date}
                            transactions={transactions}
                            periodStart={data.period.start_date}
                            periodEnd={data.period.end_date}
                        />
                    )}

                    <div className="hidden lg:block">
                        <SpendingByAccountCard transactions={transactions} />
                    </div>
                </div>
            </div>

            <AnalyticsSection data={data} stats={stats} comparable={comparable} />
        </div>
    )
}
