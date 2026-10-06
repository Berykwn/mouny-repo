import { ChevronsUpDown } from 'lucide-react'
import type { PayPeriod } from '@/types'
import { getDaysBetween } from '@/lib/helpers'

interface PeriodChipProps {
    period: PayPeriod
    onClick: () => void
}

export function PeriodChip({ period, onClick }: PeriodChipProps) {
    const month = new Date(period.start_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })
    // Both ends count: a period's first day is day 1 (matches usePeriodStats).
    const totalDays = period.end_date
        ? getDaysBetween(period.start_date, period.end_date) + 1
        : null
    const daysElapsed = period.status === 'closed' && totalDays
        ? totalDays
        : Math.max(1, getDaysBetween(period.start_date) + 1)

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full bg-surface border border-line shrink-0"
        >
            <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
            <span className="text-[12px] font-medium text-ink">{month} period</span>
            <span className="text-[11px] text-subtle-ink tabular-nums">
                day {daysElapsed}{totalDays ? ` / ${totalDays}` : ''}
            </span>
            <ChevronsUpDown className="w-[13px] h-[13px] text-subtle-ink" />
        </button>
    )
}
