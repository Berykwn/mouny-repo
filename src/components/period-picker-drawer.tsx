import { BottomDrawer } from '@/components/bottom-drawer'
import { cn } from '@/lib/utils'
import { periodName } from '@/lib/period-name'
import { periodRange } from '@/features/periods/lib/period-progress'
import type { PayPeriod } from '@/types'

/** "10 Sep – 9 Oct · closed", or "From 10 Oct · running" for the open one. */
function periodLabel(period: PayPeriod) {
    return `${periodRange(period.start_date, period.end_date)} · ${period.status === 'closed' ? 'closed' : 'running'}`
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
        <BottomDrawer open={open} onClose={onClose} title="Pick a period">
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
                                    ? 'bg-brand-tint border-brand'
                                    : 'bg-surface border-line hover:bg-surface-soft'
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={cn(
                                    'w-2 h-2 rounded-full shrink-0',
                                    isActive ? 'bg-brand' : 'bg-subtle-ink'
                                )} />
                                <div>
                                    <p className={cn('text-[13px] font-medium', isSelected ? 'text-brand-ink' : 'text-ink')}>
                                        {periodName(period)}{isActive && ' · current'}
                                    </p>
                                    <p className={cn('text-[11px]', isSelected ? 'text-brand-ink/80' : 'text-muted-ink')}>
                                        {periodLabel(period)}
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
