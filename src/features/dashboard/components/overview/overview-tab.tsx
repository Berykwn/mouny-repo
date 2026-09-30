import { useEffect, useState } from 'react'
import { payPeriodsService } from '@/services/pay-periods.service'
import { transactionsService } from '@/services/transactions.service'
import { accountsService } from '@/services/accounts-categories.service'
import { debtsService } from '@/services/debts.service'
import { getDaysBetween } from '@/lib/helpers'
import { LoadingContent } from '@/components/loading-content'
import { OverviewData } from '@/types/overview.types'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { SafeToSpendCard } from './safe-to-spend-card'
import { PeriodInsights } from './period-insights'
import { TodayWeekCard } from './today-week-card'
import { BalancesCard } from './balances-card'
import { AnalyticsSection } from '../analytics/analytics-section'
import { onTransactionsChanged } from '@/lib/transactions-bus'

async function fetchOverviewData(
    periodId: string
): Promise<OverviewData | null> {
    const [
        { data: allPeriods, error: periodsError },
        { data: txs, error: txsError },
        { data: accounts, error: accountsError },
        { data: debts },
    ] = await Promise.all([
        payPeriodsService.getAll(),
        transactionsService.getByPeriod(periodId),
        accountsService.getAll(),
        debtsService.getActive(),
    ])

    // Missing data would render as a believable Rp0 period, so treat it as a failed load.
    if (periodsError || txsError || accountsError) return null

    const allList = allPeriods ?? []
    const periodTxs = txs ?? []
    const accountsList = accounts ?? []

    const currentPeriod = allList.find(p => p.id === periodId)
    if (!currentPeriod) return null

    // Periods are sorted by start_date descending, so the period immediately
    // before this one (chronologically) is the previous entry in the list.
    const currentIndex = allList.findIndex(p => p.id === periodId)
    const prevPeriod = allList[currentIndex + 1] ?? null
    const fallbackTotalDays = prevPeriod?.start_date && prevPeriod?.end_date
        ? getDaysBetween(prevPeriod.start_date, prevPeriod.end_date) + 1
        : null

    const { data: previousSummary } = prevPeriod
        ? await transactionsService.getPeriodSummary(prevPeriod.id)
        : { data: null }

    return {
        totalIncome: periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        totalExpense: periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        transactions: periodTxs,
        accounts: accountsList,
        closingBalance: currentPeriod.closing_balance ?? null,
        period: currentPeriod,
        fallbackTotalDays,
        allPeriods: allList,
        previousSummary: previousSummary ?? null,
        totalBalance: accountsList.reduce((s, a) => s + a.balance, 0),
        // Receivables are money owed to the user, not debt.
        totalDebt: (debts ?? []).filter(d => d.type === 'debt').reduce((s, d) => s + d.remaining_amount, 0),
    }
}

export function OverviewTransaction({
    periodId,
    isActivePeriod,
}: {
    periodId: string
    isActivePeriod: boolean
}) {
    const [data, setData] = useState<OverviewData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        async function load(background = false) {
            if (!background) setLoading(true)
            const result = await fetchOverviewData(periodId)
            // Switching periods quickly: only the latest period's response may land.
            if (cancelled) return
            // A failed background refresh keeps what's on screen.
            if (result || !background) setData(result)
            setLoading(false)
        }
        load()
        // Transactions added from the top-bar button while the dashboard is open.
        const unsubscribe = onTransactionsChanged(() => { load(true) })
        return () => { cancelled = true; unsubscribe() }
    }, [periodId])

    const stats = usePeriodStats({
        period: data?.period ?? { start_date: '', end_date: null },
        transactions: data?.transactions ?? [],
        fallbackTotalDays: data?.fallbackTotalDays ?? null,
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
                        spentPercent={stats.spentPercent}
                    />

                    {isActivePeriod && <PeriodInsights transactions={transactions} stats={stats} />}
                </div>

                <div className="space-y-3">
                    <BalancesCard
                        accounts={accounts}
                        isActivePeriod={isActivePeriod}
                        closingBalance={closingBalance}
                    />

                    {isActivePeriod && (
                        <TodayWeekCard
                            key={data.period.start_date}
                            transactions={transactions}
                            periodStart={data.period.start_date}
                            periodEnd={data.period.end_date}
                        />
                    )}
                </div>
            </div>

            <AnalyticsSection data={data} />
        </div>
    )
}
