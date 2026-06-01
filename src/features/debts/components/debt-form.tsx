import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CalendarIcon } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { transactionsService } from '@/services/transactions.service'
import { accountsService } from '@/services/accounts-categories.service'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Switch } from '@/components/ui/switch'
import { toISODate } from '@/lib/helpers'
import type { Account } from '@/types'
import { toast } from 'sonner'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface DebtFormProps {
    onSuccess: () => void
    payPeriodId: string
    periodStartDate: string
}

type DebtType = 'debt' | 'receivable'

export function DebtForm({ onSuccess, payPeriodId, periodStartDate }: DebtFormProps) {
    const today = toISODate()

    const [type, setType] = useState<DebtType>('debt')
    const [counterparty, setCounterparty] = useState('')
    const [amount, setAmount] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [date, setDate] = useState(today)
    const [accountId, setAccountId] = useState('')
    const [notes, setNotes] = useState('')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(false)
    // Whether this debt/receivable actually moved money in/out of the account
    const [affectsBalance, setAffectsBalance] = useState(false)

    useEffect(() => {
        accountsService.getAll().then(({ data }) => {
            if (data) setAccounts(data)
        })
    }, [])

    // Reset affectsBalance when type changes so user consciously opts in
    const handleTypeChange = (val: string) => {
        if (!val) return
        setType(val as DebtType)
        setAffectsBalance(false)
    }

    const handleAmountChange = (raw: string) => {
        setAmount(raw.replace(/\D/g, ''))
    }

    const displayAmount = amount ? Number(amount).toLocaleString('id-ID') : ''

    // Label helpers based on type
    const affectsBalanceLabel = type === 'debt'
        ? 'Money received into account (e.g. borrowed cash)'
        : 'Money sent out of account (e.g. lent cash)'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsed = parseInt(amount, 10)
        if (!amount || isNaN(parsed) || parsed <= 0) {
            toast.error('Invalid amount.')
            return
        }
        if (!counterparty.trim()) {
            toast.error('Please enter a name.')
            return
        }
        if (affectsBalance && !accountId) {
            toast.error('Please select an account.')
            return
        }
        if (affectsBalance) {
            if (date < periodStartDate) {
                toast.error(`Date cannot be before period start (${periodStartDate}).`)
                return
            }
            if (date > today) {
                toast.error('Date cannot be in the future.')
                return
            }
        }

        setLoading(true)

        // Create debt record
        const { data: debt, error: debtError } = await debtsService.create({
            type,
            counterparty: counterparty.trim(),
            total_amount: parsed,
            remaining_amount: parsed,
            due_date: dueDate || null,
            pay_from_account_id: accountId || null,
            status: 'active',
            notes: notes || null,
        })

        if (debtError || !debt) {
            toast.error(debtError ?? 'Failed to create debt record.')
            setLoading(false)
            return
        }

        // Only create a transaction if this debt actually moved money
        if (affectsBalance && accountId) {
            const categoryName = type === 'debt' ? 'Debt Payment' : 'Receivable'
            const { data: category, error: catError } = await debtsService.findOrCreateCategory(categoryName)

            if (catError || !category) {
                toast.error('Failed to resolve category.')
                setLoading(false)
                return
            }

            // debt → income (received cash from lender)
            // receivable → expense (lent cash out)
            const { error: txError } = await transactionsService.create({
                pay_period_id: payPeriodId,
                account_id: accountId,
                type: type === 'debt' ? 'income' : 'expense',
                amount: parsed,
                note: type === 'debt'
                    ? `Debt received — ${counterparty.trim()}`
                    : `Lent to — ${counterparty.trim()}`,
                date,
                category_id: category.id,
            })

            if (txError) { toast.error(txError); setLoading(false); return }
        }

        setLoading(false)
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">

            <ToggleGroup
                variant="outline"
                type="single"
                value={type}
                onValueChange={handleTypeChange}
                className="w-full"
            >
                <ToggleGroupItem value="debt" className="flex-1">
                    Debt
                </ToggleGroupItem>
                <ToggleGroupItem value="receivable" className="flex-1">
                    Receivable
                </ToggleGroupItem>
            </ToggleGroup>

            <div className="space-y-1.5">
                <Label>{type === 'debt' ? 'Lender name' : 'Borrower name'}</Label>
                <Input
                    placeholder="Person or party"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            <div className="space-y-1.5">
                <Label>Amount</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp.
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={displayAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="pl-9"
                        required
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Affects balance toggle */}
            <div className="flex items-center justify-between rounded-xl border p-3 gap-3">
                <div className="space-y-0.5">
                    <p className="text-sm font-medium">Record to balance</p>
                    <p className="text-xs text-muted-foreground">{affectsBalanceLabel}</p>
                </div>
                <Switch
                    checked={affectsBalance}
                    onCheckedChange={setAffectsBalance}
                    disabled={loading}
                />
            </div>

            {/* Account & date only shown if affects balance */}
            {affectsBalance && (
                <>
                    <div className="space-y-1.5">
                        <Label>Account</Label>
                        <Select value={accountId} onValueChange={setAccountId} disabled={loading}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Transaction date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !date && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(new Date(date), 'yyyy-MM-dd') : 'Pick a date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date ? new Date(date) : undefined}
                                    onSelect={(d) => {
                                        if (!d) return
                                        setDate(format(d, 'yyyy-MM-dd'))
                                    }}
                                    disabled={(d) =>
                                        d < new Date(periodStartDate) || d > new Date(today)
                                    }
                                />
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                            Must be within {periodStartDate} — {today}
                        </p>
                    </div>
                </>
            )}

            <div className="space-y-1.5">
                <Label>Due date <span className="text-muted-foreground">(optional)</span></Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'w-full justify-start text-left font-normal',
                                !dueDate && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? format(new Date(dueDate), 'yyyy-MM-dd') : 'Pick a date'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={dueDate ? new Date(dueDate) : undefined}
                            onSelect={(d) => {
                                if (!d) return
                                setDueDate(format(d, 'yyyy-MM-dd'))
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-1.5">
                <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                    placeholder="Details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                />
            </div>

            <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-semibold"
                disabled={loading}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
        </form>
    )
}