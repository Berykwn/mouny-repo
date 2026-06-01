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
import { formatCurrency, toISODate } from '@/lib/helpers'
import type { Account, DebtWithAccount } from '@/types'
import { toast } from 'sonner'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface PayReceivableFormProps {
    debt: DebtWithAccount
    payPeriodId: string
    periodStartDate: string
    onSuccess: () => void
}

export function PayReceivableForm({ debt, payPeriodId, periodStartDate, onSuccess }: PayReceivableFormProps) {
    const today = toISODate()

    const [amount, setAmount] = useState(String(debt.remaining_amount))
    const [date, setDate] = useState(today)
    const [loading, setLoading] = useState(false)

    const [accounts, setAccounts] = useState<Account[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState<string>(
        debt.pay_from_account_id ?? ''
    )
    const needsAccountPick = !debt.pay_from_account_id

    useEffect(() => {
        if (needsAccountPick) {
            accountsService.getAll().then(({ data }) => {
                if (data) {
                    setAccounts(data)
                    setSelectedAccountId(data[0]?.id ?? '')
                }
            })
        }
    }, [needsAccountPick])

    const handleAmountChange = (raw: string) => {
        setAmount(raw.replace(/\D/g, ''))
    }

    const displayAmount = amount ? Number(amount).toLocaleString('id-ID') : ''

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsed = parseInt(amount, 10)
        if (!amount || isNaN(parsed) || parsed <= 0) {
            toast.error('Invalid amount.')
            return
        }
        if (parsed > debt.remaining_amount) {
            toast.error(`Maximum collectible: ${formatCurrency(debt.remaining_amount)}`)
            return
        }
        if (!selectedAccountId) {
            toast.error('Please select an account.')
            return
        }
        if (date < periodStartDate) {
            toast.error(`Date cannot be before period start (${periodStartDate}).`)
            return
        }
        if (date > today) {
            toast.error('Date cannot be in the future.')
            return
        }

        setLoading(true)

        const { data: category, error: catError } = await debtsService.findOrCreateCategory('Receivable')

        if (catError || !category) {
            toast.error('Failed to resolve category.')
            setLoading(false)
            return
        }

        const { error: txError } = await transactionsService.create({
            pay_period_id: payPeriodId,
            account_id: selectedAccountId,
            type: 'income',
            amount: parsed,
            note: `Receivable collected — ${debt.counterparty}`,
            date,
            category_id: category.id,
        })

        if (txError) { toast.error(txError); setLoading(false); return }

        const { error: debtError } = await debtsService.recordPayment(debt.id, parsed)
        setLoading(false)

        if (debtError) { toast.error(debtError); return }
        onSuccess()
    }

    const collectedAmount = debt.total_amount - debt.remaining_amount
    const collectedPercent = Math.round((collectedAmount / debt.total_amount) * 100)

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">Owed by {debt.counterparty}</p>
                        <p className="text-xl font-semibold mt-0.5">{formatCurrency(debt.remaining_amount)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">of {formatCurrency(debt.total_amount)}</p>
                </div>
                <div className="space-y-1">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${collectedPercent}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{collectedPercent}% collected</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label>Collection amount</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp.
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={displayAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="pl-9"
                        required
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label>Receive to</Label>
                {needsAccountPick ? (
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={loading}>
                        <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="h-10 px-3 rounded-md border bg-muted/50 flex items-center">
                        <p className="text-sm text-muted-foreground">{debt.pay_from_account?.name}</p>
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <Label>Collection date</Label>
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

            <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-semibold"
                disabled={loading}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Collection'}
            </Button>
        </form>
    )
}