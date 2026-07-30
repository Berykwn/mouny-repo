import { BottomDrawer } from '@/components/bottom-drawer'
import { formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { PayPeriod } from '@/types'

function periodLabel(period: PayPeriod) {
    const start = formatDate(period.start_date)
    const end = period.end_date ? formatDate(period.end_date) : 'ongoing'
    return `${start} — ${end}`
}

interface PeriodPickerDrawerProps {
    open: boolean
    onClose: () => void
    periods: PayPeriod[]
    activePeriodId?: string | null
    selectedPeriodId?: string | null
    onSelect: (period: PayPeriod) => void
}

export function PeriodPickerDrawer({
    open,
    onClose,
    periods,
    activePeriodId,
    selectedPeriodId,
    onSelect,
}: PeriodPickerDrawerProps) {
    return (
        <BottomDrawer open={open} onClose={onClose} title="Select Period">
            <section className="space-y-1.5 pb-2">
                {periods.map(period => {
                    const isActive = period.id === activePeriodId
                    const isSelected = period.id === selectedPeriodId
                    return (
                        <button
                            key={period.id}
                            onClick={() => onSelect(period)}
                            className={cn(
                                'w-full flex items-center justify-between px-4 py-3 rounded-[14px] border text-left transition-colors',
                                isSelected
                                    ? 'bg-[#f2f6ea] border-[#6FA82B]'
                                    : 'bg-white border-[#e5e5e5] hover:bg-[#fbfbfa]'
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={cn(
                                    'w-2 h-2 rounded-full shrink-0',
                                    isActive ? 'bg-[#6FA82B]' : 'bg-[#a3a3a3]'
                                )} />
                                <div>
                                    <p className={cn('text-[13px] font-medium', isSelected ? 'text-[#4d7a1d]' : 'text-[#252525]')}>
                                        {isActive ? 'Current period' : formatDate(period.start_date)}
                                    </p>
                                    <p className={cn('text-[11px]', isSelected ? 'text-[#4d7a1d]/80' : 'text-[#8a8a84]')}>
                                        {periodLabel(period)} · {period.status}
                                    </p>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </section>
        </BottomDrawer>
    )
}
