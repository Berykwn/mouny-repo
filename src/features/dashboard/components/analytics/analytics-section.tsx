import { PeriodAnalytics } from './period-analytics'
import { PeriodTotalsCard } from '../overview/period-totals'
import type { OverviewData } from '@/types/overview.types'

export function AnalyticsSection({ data }: { data: OverviewData }) {
    return (
        <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-1 mb-1">
                Analytics
            </p>
            {/* Desktop shows these tiles in the headline card. */}
            <div className="pt-3 lg:hidden">
                <PeriodTotalsCard transactions={data.transactions} previousSummary={data.previousSummary} />
            </div>
            <PeriodAnalytics
                transactions={data.transactions}
                period={data.period}
                periods={data.allPeriods}
                fallbackTotalDays={data.fallbackTotalDays}
            />
        </div>
    )
}
