import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, ChevronRight } from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { payPeriodsService } from '@/services/pay-periods.service'
import { useAccounts } from '@/queries'
import { useSeedOnce } from '@/hooks/use-seed-once'
import { usePeriodStore } from '@/stores/period-store'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import type { Account } from '@/types'
import { AccountTypeTile } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { BusyLabel } from '@/components/busy-label'

interface OpenPeriodFormProps {
    onSuccess: () => void
}

const FIELD_LABEL = 'text-[13px] font-semibold text-muted-ink'
/** The app's field: 16px text on phones so iOS doesn't zoom in on focus. */
const FIELD = 'h-[52px] rounded-[14px] border-line bg-surface shadow-none px-4 text-[16px] md:text-[15px] text-ink placeholder:text-subtle-ink'

const NO_ACCOUNTS: Account[] = []

export function OpenPeriodForm({ onSuccess }: OpenPeriodFormProps) {
    const [startDate, setStartDate] = useState<Date | undefined>(new Date())
    const [dateOpen, setDateOpen] = useState(false)
    const [salary, setSalary] = useState('')
    const [accountId, setAccountId] = useState('')
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)
    const { data: accountsData } = useAccounts()
    const accounts = accountsData ?? NO_ACCOUNTS
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    const selectedAccount = accounts.find((a) => a.id === accountId)
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    // Pay lands in one of the everyday accounts; only when there is just one is that a given.
    useSeedOnce(accountsData, data => {
        const everyday = data.filter(a => !a.is_savings)
        if (everyday.length === 1) setAccountId(everyday[0].id)
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsed = parseCurrencyInput(salary)
        if (!salary || parsed <= 0) {
            toast.error('Please enter a valid salary amount.')
            return
        }
        if (!accountId) {
            toast.error('Please select a destination account.')
            return
        }
        // A future start makes every transaction date fall outside the period until then.
        if (toISODate(startDate) > toISODate()) {
            toast.error('Pay date cannot be in the future.')
            return
        }

        setLoading(true)

        const { error } = await payPeriodsService.openNew({
            start_date: toISODate(startDate),
            salary_amount: parsed,
            salary_account_id: accountId,
            notes: notes || undefined,
        })

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        // Overview and Ledger move to the new period rather than staying on an old pick.
        usePeriodStore.getState().setSelectedPeriodId(null)
        toast.success('New period, fresh start.')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="space-y-1.5">
                <Label id="open-pay-date-label" className={FIELD_LABEL}>Pay date</Label>

                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                        <button
                            id="open-pay-date"
                            aria-labelledby="open-pay-date-label open-pay-date"
                            type="button"
                            disabled={loading}
                            className={cn(
                                'w-full flex items-center h-[52px] px-4 rounded-[14px] border border-line bg-surface text-left text-[15px] text-ink transition-colors hover:bg-surface-soft disabled:opacity-50 disabled:pointer-events-none',
                                !startDate && 'text-subtle-ink'
                            )}
                        >
                            <CalendarIcon aria-hidden="true" className="mr-2.5 h-4 w-4 text-subtle-ink" />
                            {startDate
                                ? format(startDate, 'dd MMM yyyy')
                                : 'Pick a date'}
                        </button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0 rounded-[14px] border-line">
                        <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => {
                                setStartDate(date)
                                setDateOpen(false)
                            }}
                            disabled={(date) => date > endOfToday}
                        />
                    </PopoverContent>
                </Popover>

                <span className="text-[12px] text-subtle-ink">
                    Defaults to today if empty.
                </span>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="period-income" className={FIELD_LABEL}>Expected income</Label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-subtle-ink">
                        Rp
                    </span>
                    <Input
                        id="period-income"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatCurrencyInput(salary)}
                        onChange={(e) => setSalary(e.target.value.replace(/\D/g, ''))}
                        className={cn(FIELD, 'pl-11 tabular-nums')}
                        required
                        disabled={loading}
                    />
                </div>
                <span className="text-[12px] text-subtle-ink">
                    This can’t be changed once the period is open.
                </span>
            </div>

            <div role="group" aria-labelledby="open-period-destination-label" className="space-y-1.5">
                <Label id="open-period-destination-label" className={FIELD_LABEL}>Destination account</Label>
                {accountsData && accounts.length === 0 ? (
                    <div className="flex items-center justify-between gap-3 px-4 h-[52px] rounded-[14px] border border-dashed border-line-strong">
                        <span className="text-[14px] text-subtle-ink">No accounts yet</span>
                        <Link to="/accounts" state={{ add: true }} className="text-[14px] font-semibold text-brand-ink hover:text-brand transition-colors">
                            Add an account first
                        </Link>
                    </div>
                ) : (
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => setAccountPickerOpen(true)}
                    className="w-full flex items-center justify-between px-3 h-[52px] rounded-[14px] border border-line bg-surface text-left transition-colors hover:bg-surface-soft disabled:opacity-50 disabled:pointer-events-none"
                >
                    {selectedAccount ? (
                        <div className="flex items-center gap-3 min-w-0">
                            <AccountTypeTile type={selectedAccount.type} savings={selectedAccount.is_savings} />
                            <div className="min-w-0">
                                <p className="text-[15px] text-ink truncate">{selectedAccount.name}</p>
                                <p className="text-[13px] text-subtle-ink tabular-nums">{formatCurrency(selectedAccount.balance)}</p>
                            </div>
                        </div>
                    ) : (
                        <span className="px-1 text-[15px] text-subtle-ink">Pick where your pay lands</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-subtle-ink shrink-0" />
                </button>
                )}
                <AccountPickerDrawer
                    open={accountPickerOpen}
                    onClose={() => setAccountPickerOpen(false)}
                    accounts={accounts}
                    selectedId={accountId}
                    onSelect={(a) => { setAccountId(a.id); setAccountPickerOpen(false) }}
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="period-notes" className={FIELD_LABEL}>
                    Notes{' '}
                    <span className="font-normal text-subtle-ink">(optional)</span>
                </Label>
                <Input
                    id="period-notes"

                    placeholder="April salary, bonus, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    className={FIELD}
                />
            </div>

            <button
                type="submit"
                disabled={loading || accounts.length === 0}
                className="w-full h-12 rounded-[14px] text-[15px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                <BusyLabel busy={loading} className="mx-auto">Open period</BusyLabel>
            </button>
        </form>
    )
}
