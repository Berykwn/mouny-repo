import { Link } from 'react-router-dom'
import { OverviewSkeleton } from './overview-skeleton'
import { useOverviewData } from '../../hooks/use-overview-data'
import { useCashOutlook } from '../../hooks/use-cash-outlook'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { formatShortCurrency, toISODate } from '@/lib/helpers'
import { shortDate } from '@/features/bills/lib/bill-labels'
import { QuickAddCard } from '@/features/quick-transactions/components/quick-add-card'
import { BalancesList, BalancesRow } from './balances-card'
import { HomeHero } from '../home/home-hero'
import { SmartLineSlot } from '../home/smart-line'
import { DueSoonList } from '../home/due-soon-list'
import { LatestList, TodayList } from '../home/today-list'
import { HomeSection } from '../home/home-section'
import { CashOutlookChart } from '../cash-outlook-chart'
import { heroNumbers } from '../../lib/home'

/**
 * Home answers "what can I spend today?": the hero, at most one line worth acting on,
 * then balances, today's entries and the bills before payday. The analysis is on Insights.
 */
export function OverviewTransaction({
    periodId,
    isActivePeriod,
}: {
    periodId: string
    isActivePeriod: boolean
}) {
    const { data, loading, retry } = useOverviewData(periodId)
    const reserve = useBillReserve(data?.period, data?.transactions)

    const stats = usePeriodStats({
        period: data?.period ?? { start_date: '', end_date: null },
        transactions: data?.transactions ?? [],
        fallbackTotalDays: data?.fallbackTotalDays ?? null,
        reservedBills: reserve.reserved,
    })
    const outlook = useCashOutlook(data?.period, data?.accounts, stats, reserve)

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
    const today = toISODate()

    return (
        <div className="mt-1.5 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10 lg:items-start">
            <div className="space-y-6">
                <HomeHero stats={stats} />

                {isActivePeriod && (
                    <SmartLineSlot
                        period={data.period}
                        transactions={transactions}
                        accounts={accounts}
                        dues={reserve.dues}
                        daysLeft={heroNumbers(stats).daysLeft}
                    />
                )}

                {/* Desktop lists each account in the side column instead. */}
                <div className={isActivePeriod ? 'lg:hidden' : undefined}>
                    <BalancesRow accounts={accounts} isActivePeriod={isActivePeriod} closingBalance={closingBalance} />
                </div>

                {isActivePeriod && (
                    <div className="lg:hidden">
                        <DueSoonList dues={reserve.dues} period={data.period} />
                    </div>
                )}

                {isActivePeriod
                    ? <TodayList transactions={transactions} today={today} />
                    : <LatestList transactions={transactions} />}

                {/* On a phone the bottom nav's + button already adds a transaction. */}
                {isActivePeriod && (
                    <div className="hidden lg:block">
                        <QuickAddCard period={data.period} />
                    </div>
                )}
            </div>

            {isActivePeriod && (
                <aside className="hidden lg:block space-y-8">
                    <DueSoonList dues={reserve.dues} period={data.period} />
                    <BalancesList accounts={accounts} />
                    {outlook && (
                        <HomeSection
                            title="Next 6 weeks"
                            aside={<Link to="/insights?tab=cash-flow" className="text-[13px] font-medium text-brand-ink">Insights</Link>}
                        >
                            <p className="mb-2 text-[13px] text-muted-ink">
                                Lowest point{' '}
                                <span className={outlook.lowest.balance < 0 ? 'font-semibold text-negative' : 'font-semibold text-ink'}>
                                    {formatShortCurrency(outlook.lowest.balance)}
                                </span>
                                {' '}on {shortDate(outlook.lowest.date)}.
                            </p>
                            <CashOutlookChart outlook={outlook} height={150} />
                        </HomeSection>
                    )}
                </aside>
            )}
        </div>
    )
}
