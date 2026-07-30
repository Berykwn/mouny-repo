import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, ChevronRight, Loader2 } from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { payPeriodsService } from '@/services/pay-periods.service'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import type { Account } from '@/types'
import { AccountTypeIcon } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'

interface OpenPeriodFormProps {
    onSuccess: () => void
}

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'

export function OpenPeriodForm({ onSuccess }: OpenPeriodFormProps) {
    const [startDate, setStartDate] = useState<Date | undefined>(new Date())
    const [dateOpen, setDateOpen] = useState(false)
    const [salary, setSalary] = useState('')
    const [accountId, setAccountId] = useState('')
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    const selectedAccount = accounts.find((a) => a.id === accountId)

    useEffect(() => {
        accountsService.getAll().then(({ data }) => {
            if (data) {
                setAccounts(data)
                setAccountId(data[0]?.id ?? '')
            }
        })
    }, [])

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

        toast.success('Pay period opened successfully.')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Pay date</Label>

                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            disabled={loading}
                            className={cn(
                                'w-full flex items-center h-12 px-3 rounded-[14px] border border-[#e5e5e5] bg-white text-left text-[13px] transition-colors hover:bg-[#fbfbfa] disabled:opacity-50 disabled:pointer-events-none',
                                !startDate && 'text-[#8a8a84]'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 text-[#8a8a84]" />
                            {startDate
                                ? format(startDate, 'dd MMM yyyy')
                                : 'Pick a date'}
                        </button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0 rounded-[14px] border-[#e5e5e5]">
                        <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => {
                                setStartDate(date)
                                setDateOpen(false)
                            }}
                        />
                    </PopoverContent>
                </Popover>

                <span className="text-[11px] text-[#8a8a84]">
                    Defaults to today if empty.
                </span>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Expected Income / Salary</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a84] font-medium">
                        Rp
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatCurrencyInput(salary)}
                        onChange={(e) => setSalary(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                        required
                        disabled={loading}
                    />
                </div>
                <span className="text-[11px] text-[#d97706]">
                    Expected income cannot be edited after the pay period is opened.
                </span>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Destination account</Label>
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => setAccountPickerOpen(true)}
                    className="w-full flex items-center justify-between px-3 h-[52px] rounded-[14px] border border-[#e5e5e5] bg-white text-left transition-colors hover:bg-[#fbfbfa] disabled:opacity-50 disabled:pointer-events-none"
                >
                    {selectedAccount ? (
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-[10px] bg-[#f4f4f2] flex items-center justify-center shrink-0">
                                <AccountTypeIcon type={selectedAccount.type} className="w-4 h-4 text-[#8a8a84]" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[#252525] truncate">{selectedAccount.name}</p>
                                <p className="text-[11.5px] text-[#8a8a84]">{formatCurrency(selectedAccount.balance)}</p>
                            </div>
                        </div>
                    ) : (
                        <span className="text-[13px] text-[#8a8a84]">Select account</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-[#a3a3a3] shrink-0" />
                </button>
                <AccountPickerDrawer
                    open={accountPickerOpen}
                    onClose={() => setAccountPickerOpen(false)}
                    accounts={accounts}
                    selectedId={accountId}
                    onSelect={(a) => { setAccountId(a.id); setAccountPickerOpen(false) }}
                />
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>
                    Notes{' '}
                    <span className="normal-case tracking-normal font-normal">(optional)</span>
                </Label>
                <Input
                    placeholder="April salary, bonus, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                />
            </div>

            <button
                type="submit"
                disabled={loading || accounts.length === 0}
                className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                {loading
                    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    : 'Open Pay Period'}
            </button>
        </form>
    )
}
