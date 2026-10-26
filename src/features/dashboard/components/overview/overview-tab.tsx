import { OverviewSkeleton } from './overview-skeleton'
import { useOverviewData } from '../../hooks/use-overview-data'
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
import { Link } from 'react-router-dom'
import { ChartLine, ChevronRight } from 'lucide-react'

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
                className='shrink-0 h-9 rounded-[10px] bg-action px-4 text-[12.5px] font-semibold text-on-action transition-colors hover:bg-action/90'
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
                    {/* Accounts open from here; they have no tab of their own. */}
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

                    <div className="hidden lg:block">
                        <SpendingByAccountCard transactions={transactions} />
                    </div>
                </div>
            </div>

            {/* The deep analysis lives on Insights; Home stays about today. */}
            <Link to='/insights' className='card mt-3 flex items-center gap-3 px-5 py-4 hover:bg-surface-soft transition-colors'>
                <span className='w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 bg-brand-tint text-brand-ink'>
                    <ChartLine className='w-4 h-4' strokeWidth={1.9} />
                </span>
                <span className='flex-1 min-w-0'>
                    <span className='block text-[13.5px] font-medium text-ink'>Insights</span>
                    <span className='block text-[11.5px] text-muted-ink truncate'>Habits, cash flow and trends across your periods</span>
                </span>
                <ChevronRight className='w-4 h-4 text-faint-ink shrink-0' />
            </Link>
        </div>
    )
}
