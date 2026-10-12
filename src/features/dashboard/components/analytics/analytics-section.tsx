import { PeriodAnalytics } from './period-analytics'
import { PeriodTotalsCard } from '../overview/period-totals'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { ComparableSpending } from '@/lib/comparable-spending'
import type { OverviewData } from '@/types/overview.types'

export function AnalyticsSection({ data, stats, comparable }: {
    data: OverviewData
    /** The overview's stats, worked out once so every card reads the same numbers. */
    stats: PeriodStats
    comparable: ComparableSpending | null
}) {
    return (
        <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-1 mb-1">
                Analytics
            </p>
            {/* Desktop shows these tiles in the headline card. */}
            <div className="pt-3 lg:hidden">
                <PeriodTotalsCard
                    totalIncome={stats.totalIncome}
                    totalSpending={stats.totalSpending}
                    totalSavings={stats.totalSavings}
                    previousSummary={data.previousSummary}
                    comparable={comparable}
                />
            </div>
            <PeriodAnalytics
                transactions={data.transactions}
                period={data.period}
                periods={data.allPeriods}
                stats={stats}
            />
        </div>
    )
}
