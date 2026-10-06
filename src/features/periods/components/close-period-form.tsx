import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, AlertTriangle, Info } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { payPeriodsService } from '@/services/pay-periods.service'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import type { PayPeriod } from '@/types'

interface ClosePeriodFormProps {
    period: PayPeriod
    onSuccess: () => void
}

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'

export function ClosePeriodForm({ period, onSuccess }: ClosePeriodFormProps) {
    const [endDate, setEndDate] = useState<Date | undefined>(new Date())
    const [dateOpen, setDateOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [confirmed, setConfirmed] = useState(false)

    // Bare YYYY-MM-DD parses as UTC midnight; compare against local midnight like the calendar does.
    const periodStart = new Date(period.start_date + 'T00:00:00')
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const handleClose = async () => {
        const closeDate = toISODate(endDate ?? new Date())
        if (closeDate < period.start_date) {
            toast.error('Closing date cannot be before the period start.')
            return
        }
        if (closeDate > toISODate()) {
            toast.error('Closing date cannot be in the future.')
            return
        }

        setLoading(true)

        const { data: accounts, error: accountsError } = await accountsService.getAll()
        if (accountsError) {
            setLoading(false)
            toast.error(accountsError)
            return
        }
        const closingBalance = (accounts ?? []).reduce((s, a) => s + a.balance, 0)

        const { error } = await payPeriodsService.close(
            period.id,
            closingBalance,
            closeDate
        )

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success('Pay period closed successfully.')
        onSuccess()
    }

    if (!confirmed) {
        return (
            <div className="space-y-4 pb-2">
                <div className="flex items-start gap-3 rounded-[14px] border border-negative-line bg-negative-soft px-4 py-4">
                    <AlertTriangle className="w-4 h-4 text-negative shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink">Close this period?</p>
                        <p className="text-[11.5px] text-negative mt-0.5">This action cannot be undone.</p>
                    </div>
                </div>

                <div className="rounded-[20px] border border-line bg-surface p-4 space-y-4">
                    <div className="flex justify-between text-[13px]">
                        <span className="text-muted-ink">Start date</span>
                        <span className="font-medium text-ink">{period.start_date}</span>
                    </div>

                    <div className="flex justify-between text-[13px]">
                        <span className="text-muted-ink">Salary</span>
                        <span className="font-medium text-ink">
                            {formatCurrency(period.salary_amount)}
                        </span>
                    </div>

                    <div className="border-t border-line-soft" />

                    <div className="space-y-1.5">
                        <Label className={FIELD_LABEL}>Closing date*</Label>

                        <Popover open={dateOpen} onOpenChange={setDateOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        'w-full flex items-center h-12 px-3 rounded-[14px] border border-line bg-surface text-left text-[13px] transition-colors hover:bg-surface-soft',
                                        !endDate && 'text-muted-ink'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-ink" />
                                    {endDate
                                        ? format(endDate, 'dd MMM yyyy')
                                        : 'Pick a date'}
                                </button>
                            </PopoverTrigger>

                            <PopoverContent className="w-auto p-0 rounded-[14px] border-line">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={(date) => {
                                        setEndDate(date)
                                        setDateOpen(false)
                                    }}
                                    disabled={(date) => date < periodStart || date > today}
                                />
                            </PopoverContent>
                        </Popover>
                        <span className="text-[11px] text-muted-ink">
                            Defaults to today if empty.
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setConfirmed(true)}
                    className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-negative hover:bg-negative/90 transition-colors"
                >
                    Yes, close this period
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4 pb-2">
            <div className="flex items-start gap-3 rounded-[14px] border border-line bg-surface-hover px-4 py-4">
                <Info className="w-4 h-4 text-muted-ink shrink-0 mt-0.5" />
                <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">Close Period</p>
                    <p className="text-[11.5px] text-muted-ink mt-0.5">
                        Closing balance will be calculated automatically from all your accounts.
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-negative hover:bg-negative/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                {loading
                    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    : 'Confirm Close Period'}
            </button>

            <button
                type="button"
                onClick={() => setConfirmed(false)}
                disabled={loading}
                className="w-full h-12 rounded-[14px] text-[13px] font-semibold border border-line text-ink hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                Cancel
            </button>
        </div>
    )
}
