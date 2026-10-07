import { PeriodAnalytics } from './period-analytics'
import type { OverviewData } from '@/types/overview.types'

export function AnalyticsSection({ data }: { data: OverviewData }) {
    return (
        <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-1 mb-1">
                Analytics
            </p>
            <PeriodAnalytics
                transactions={data.transactions}
                period={data.period}
                periods={data.allPeriods}
                fallbackTotalDays={data.fallbackTotalDays}
            />
        </div>
    )
}
