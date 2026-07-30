import { ChevronsUpDown } from 'lucide-react'
import type { PayPeriod } from '@/types'
import { getDaysBetween } from '@/lib/helpers'

interface PeriodChipProps {
    period: PayPeriod
    onClick: () => void
}

export function PeriodChip({ period, onClick }: PeriodChipProps) {
    const month = new Date(period.start_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })
    const totalDays = period.end_date
        ? Math.max(1, getDaysBetween(period.start_date, period.end_date))
        : null
    const daysElapsed = period.status === 'closed' && totalDays
        ? totalDays
        : Math.max(1, getDaysBetween(period.start_date))

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full bg-white border border-[#e5e5e5] shrink-0"
        >
            <span className="w-1.5 h-1.5 rounded-full bg-[#6FA82B] shrink-0" />
            <span className="text-[12px] font-medium text-[#252525]">{month} period</span>
            <span className="text-[11px] text-[#a3a3a3] tabular-nums">
                day {daysElapsed}{totalDays ? ` / ${totalDays}` : ''}
            </span>
            <ChevronsUpDown className="w-[13px] h-[13px] text-[#a3a3a3]" />
        </button>
    )
}
