import { useEffect, useState } from 'react'
import { payPeriodsService } from '@/services/pay-periods.service'
import { transactionsService } from '@/services/transactions.service'
import { accountsService } from '@/services/accounts-categories.service'
import { getDaysBetween } from '@/lib/helpers'
import { LoadingContent } from '@/components/loading-content'
import { OverviewData } from '@/types/overview.types'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { SafeToSpendCard } from './safe-to-spend-card'
import { PeriodInsight } from './period-insight'
import { TodayTransactionsCard } from './today-transactions-card'
import { BalancesCard } from './balances-card'

async function fetchOverviewData(
    periodId: string
): Promise<OverviewData | null> {
    const [
        { data: allPeriods },
        { data: txs },
        { data: accounts },
    ] = await Promise.all([
        payPeriodsService.getAll(),
        transactionsService.getByPeriod(periodId),
        accountsService.getAll(),
    ])

    const allList = allPeriods ?? []
    const periodTxs = txs ?? []

    const currentPeriod = allList.find(p => p.id === periodId)
    if (!currentPeriod) return null

    // Periods are sorted by start_date descending, so the period immediately
    // before this one (chronologically) is the previous entry in the list.
    const currentIndex = allList.findIndex(p => p.id === periodId)
    const prevPeriod = allList[currentIndex + 1] ?? null
    const fallbackTotalDays = prevPeriod?.start_date && prevPeriod?.end_date
        ? getDaysBetween(prevPeriod.start_date, prevPeriod.end_date)
        : null

    return {
        totalIncome: periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        totalExpense: periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        transactions: periodTxs,
        accounts: accounts ?? [],
        closingBalance: currentPeriod.closing_balance ?? null,
        period: { start_date: currentPeriod.start_date, end_date: currentPeriod.end_date },
        fallbackTotalDays,
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
        async function load() {
            setLoading(true)
            const result = await fetchOverviewData(periodId)
            setData(result)
            setLoading(false)
        }
        load()
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
        <div className="mt-1.5 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start">
            <div className="space-y-3">
                <SafeToSpendCard
                    totalIncome={stats.totalIncome}
                    totalExpense={stats.totalExpense}
                    remaining={stats.remaining}
                    spentPercent={stats.spentPercent}
                />

                {isActivePeriod && (
                    <>
                        <PeriodInsight
                            transactions={transactions}
                            totalExpense={stats.totalExpense}
                            dailyAvg={stats.dailyAvg}
                            safeDaily={stats.safeDaily}
                        />

                        <TodayTransactionsCard transactions={transactions} />
                    </>
                )}
            </div>

            <BalancesCard
                accounts={accounts}
                isActivePeriod={isActivePeriod}
                closingBalance={closingBalance}
            />
        </div>
    )
}
