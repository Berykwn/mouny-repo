import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'

interface DateQuickPickerProps {
    date: string
    periodStart: string
    maxDate: string
    onChange: (date: string) => void
    disabled?: boolean
}

const CHIP_BASE = 'inline-flex items-center gap-1.5 px-4 h-9 rounded-full border text-[13px] font-medium transition-colors duration-150'
const CHIP_ACTIVE = 'border-[#6FA82B] bg-[#f2f6ea] text-[#4d7a1d]'
const CHIP_INACTIVE = 'border-[#e5e5e5] bg-white text-[#252525]'

export function DateQuickPicker({ date, periodStart, maxDate, onChange, disabled }: DateQuickPickerProps) {
    const [customOpen, setCustomOpen] = useState(false)

    const todayStr = toISODate()
    const yesterdayStr = toISODate(new Date(Date.now() - 86400000))
    const isToday = date === todayStr
    const isYesterday = date === yesterdayStr
    const isCustom = !isToday && !isYesterday

    const todayInRange = todayStr >= periodStart && todayStr <= maxDate
    const yesterdayInRange = yesterdayStr >= periodStart && yesterdayStr <= maxDate

    return (
        <div className="space-y-1.5">
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={disabled || !todayInRange}
                    onClick={() => onChange(todayStr)}
                    className={cn(CHIP_BASE, isToday ? CHIP_ACTIVE : CHIP_INACTIVE, !todayInRange && 'opacity-40 pointer-events-none')}
                >
                    Today
                </button>
                <button
                    type="button"
                    disabled={disabled || !yesterdayInRange}
                    onClick={() => onChange(yesterdayStr)}
                    className={cn(CHIP_BASE, isYesterday ? CHIP_ACTIVE : CHIP_INACTIVE, !yesterdayInRange && 'opacity-40 pointer-events-none')}
                >
                    Yesterday
                </button>

                <Popover open={customOpen} onOpenChange={setCustomOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => setCustomOpen(true)}
                            className={cn(CHIP_BASE, isCustom ? CHIP_ACTIVE : CHIP_INACTIVE)}
                        >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {isCustom ? format(new Date(date + 'T00:00:00'), 'dd MMM') : 'Custom'}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-auto p-0 rounded-[14px] border-[#e5e5e5]">
                        <Calendar
                            mode="single"
                            selected={new Date(date + 'T00:00:00')}
                            onSelect={(d) => {
                                if (!d) return
                                onChange(format(d, 'yyyy-MM-dd'))
                                setCustomOpen(false)
                            }}
                            disabled={(d) =>
                                d < new Date(periodStart + 'T00:00:00') ||
                                d > new Date(maxDate + 'T00:00:00')
                            }
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <p className="text-[11px] text-[#a3a3a3]">
                {format(new Date(periodStart + 'T00:00:00'), 'dd MMM')} — {format(new Date(maxDate + 'T00:00:00'), 'dd MMM yyyy')}
            </p>
        </div>
    )
}
