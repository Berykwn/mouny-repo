import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, Loader2 } from 'lucide-react'

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
import { toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import type { Account } from '@/types'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

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

    useEffect(() => {
        accountsService.getAll().then(({ data }) => {
            if (data) {
                setAccounts(data)
                setAccountId(data[0]?.id ?? '')
            }
        })
    }, [])

    const handleSalaryChange = (raw: string) => {
        const digitsOnly = raw.replace(/\D/g, '')
        setSalary(digitsOnly)
    }

    const displaySalary = salary
        ? Number(salary).toLocaleString('id-ID')
        : ''

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsed = parseInt(salary, 10)
        if (!salary || isNaN(parsed) || parsed <= 0) {
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
            {/* DATE PICKER */}
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
                                ? format(startDate, 'yyyy-MM-dd')
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

            {/* SALARY */}
            <div>
                <Label>Expected Income / Salary</Label>
                <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp.
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={displaySalary}
                        onChange={(e) => handleSalaryChange(e.target.value)}
                        className="pl-9"
                        required
                        disabled={loading}
                    />
                </div>
                <span className="text-xs font-light text-orange-500 -mt-1">
                    Expected income cannot be edited after the pay period is opened.
                </span>
            </div>

            {/* ACCOUNT */}
            <div className="space-y-1.5">
                <Label>Destination account</Label>
                <Select
                    value={accountId}
                    onValueChange={(value) => setAccountId(value)}
                    disabled={loading}
                >
                    <SelectTrigger className="h-10">
                        <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* <SelectItem value="none">No accounts yet</SelectItem> */}
                        {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                                {a.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* NOTES */}
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
                className="w-full"
                disabled={loading || accounts.length === 0}
            >
                {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Open Pay Period'}
            </Button>
        </form>
    )
}