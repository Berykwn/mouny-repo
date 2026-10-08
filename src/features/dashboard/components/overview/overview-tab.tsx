import { useMemo } from 'react'
import { useAccounts, useDebts, usePeriods, usePeriodSummary, usePeriodTransactions } from '@/queries'
import { getDaysBetween } from '@/lib/helpers'
import { LoadingContent } from '@/components/loading-content'
import { OverviewData } from '@/types/overview.types'
import { usePeriodStats } from '@/hooks/use-period-stats'
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
function useOverviewData(periodId: string): { data: OverviewData | null; loading: boolean } {
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
    return { data, loading }
}

export function OverviewTransaction({
    periodId,
    isActivePeriod,
}: {
    periodId: string
    isActivePeriod: boolean
}) {
    const { data, loading } = useOverviewData(periodId)
    const reserve = useBillReserve(data?.period, data?.transactions)

    const stats = usePeriodStats({
        period: data?.period ?? { start_date: '', end_date: null },
        transactions: data?.transactions ?? [],
        fallbackTotalDays: data?.fallbackTotalDays ?? null,
        reservedBills: reserve.reserved,
    })

    if (loading) return <LoadingContent />
    if (!data) return (
        <section className='card p-4 mt-1.5'>
            <h2 className='text-[13px] font-medium text-ink'>Failed to load period data.</h2>
            <p className='text-[11.5px] text-muted-ink mt-1'>Please try again.</p>
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

            <AnalyticsSection data={data} />
        </div>
    )
}
