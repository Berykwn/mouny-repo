import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, ChevronDown, Check, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import type { Account } from '@/types'
import { AccountTypeIcon } from '@/components/account-type-icon'

interface OpenPeriodFormProps {
    onSuccess: () => void
}

export function OpenPeriodForm({ onSuccess }: OpenPeriodFormProps) {
    const [startDate, setStartDate] = useState<Date | undefined>(new Date())
    const [salary, setSalary] = useState('')
    const [accountId, setAccountId] = useState('')
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
                <Label>Pay date</Label>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'w-full justify-start text-left font-normal',
                                !startDate && 'text-muted-foreground'
                            )}
                            disabled={loading}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate
                                ? format(startDate, 'dd MMM yyyy')
                                : 'Pick a date'}
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => setStartDate(date)}
                        />
                    </PopoverContent>
                </Popover>

                <span className="text-xs text-muted-foreground">
                    Defaults to today if empty.
                </span>
            </div>

            <div>
                <Label>Expected Income / Salary</Label>
                <div className="relative mt-2">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                        Rp
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatCurrencyInput(salary)}
                        onChange={(e) => setSalary(e.target.value.replace(/\D/g, ''))}
                        className="pl-10"
                        required
                        disabled={loading}
                    />
                </div>
                <span className="text-xs font-light text-orange-500 -mt-1">
                    Expected income cannot be edited after the pay period is opened.
                </span>
            </div>

            <div className="space-y-1.5">
                <Label>Destination account</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            disabled={loading}
                            className={cn(
                                'w-full flex items-center justify-between px-3 h-12 rounded-xl border bg-card',
                                'text-left transition-colors hover:bg-muted/50 disabled:opacity-50'
                            )}
                        >
                            {selectedAccount ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                        <AccountTypeIcon type={selectedAccount.type} className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{selectedAccount.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatCurrency(selectedAccount.balance)}</p>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm text-muted-foreground">Select account</span>
                            )}
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
                        {accounts.map((a) => (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => setAccountId(a.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                                    accountId === a.id ? 'bg-muted' : 'hover:bg-muted'
                                )}
                            >
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <AccountTypeIcon type={a.type} className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-foreground truncate">{a.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{formatCurrency(a.balance)}</p>
                                </div>
                                {accountId === a.id && (
                                    <div className="w-4 h-4 rounded-full bg-orange-400 flex items-center justify-center shrink-0">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-1.5">
                <Label>
                    Notes{' '}
                    <span className="text-muted-foreground font-normal">
                        (optional)
                    </span>
                </Label>
                <Input
                    placeholder="April salary, bonus, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                />
            </div>

            <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-semibold"
                disabled={loading || accounts.length === 0}
            >
                {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Open Pay Period'}
            </Button>
        </form>
    )
}