import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CalendarIcon, ChevronDown, Check } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { transactionsService } from '@/services/transactions.service'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import type { Account } from '@/types'
import type { DebtWithAccount } from '@/types'
import { toast } from 'sonner'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { AccountTypeIcon } from '@/components/account-type-icon'
import { cn } from '@/lib/utils'

interface PayDebtFormProps {
    debt: DebtWithAccount
    payPeriodId: string
    periodStartDate: string
    onSuccess: () => void
}

export function PayDebtForm({ debt, payPeriodId, periodStartDate, onSuccess }: PayDebtFormProps) {
    const today = toISODate()

    const [amount, setAmount] = useState(String(debt.remaining_amount))
    const [date, setDate] = useState(today)
    const [loading, setLoading] = useState(false)
    const [openPaymentPopover, setOpenPaymentPopover] = useState(false)

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

    const selectedAccount = accounts.find(a => a.id === selectedAccountId)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsed = parseCurrencyInput(amount)
        if (!amount || parsed <= 0) {
            toast.error('Invalid amount.')
            return
        }
        if (parsed > debt.remaining_amount) {
            toast.error(`Maximum payable: ${formatCurrency(debt.remaining_amount)}`)
            return
        }
        if (!selectedAccountId) {
            toast.error('Please select a payment account.')
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
        if (!selectedAccount) {
            toast.error('Account not found.')
            return
        }

        setLoading(true)

        const { data: category, error: catError } = await debtsService.findOrCreateCategory('Debt Payment')

        if (catError || !category) {
            toast.error('Failed to resolve category.')
            setLoading(false)
            return
        }

        const { error: txError } = await transactionsService.create({
            pay_period_id: payPeriodId,
            account_id: selectedAccountId,
            type: 'expense',
            amount: parsed,
            note: `Debt payment — ${debt.counterparty}`,
            date,
            category_id: category.id,
        })

        if (txError) { toast.error(txError); setLoading(false); return }

        const { error: debtError } = await debtsService.recordPayment(debt.id, parsed)
        setLoading(false)

        if (debtError) { toast.error(debtError); return }

        toast.success('Debt payment recorded.')
        onSuccess()
    }

    const paidAmount = debt.total_amount - debt.remaining_amount
    const paidPercent = Math.round((paidAmount / debt.total_amount) * 100)

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">Owed to {debt.counterparty}</p>
                        <p className="text-xl font-semibold mt-0.5">{formatCurrency(debt.remaining_amount)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">of {formatCurrency(debt.total_amount)}</p>
                </div>
                <div className="space-y-1">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-foreground rounded-full transition-all"
                            style={{ width: `${paidPercent}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{paidPercent}% paid</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label>Payment amount</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                        Rp
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-11 text-sm font-mono"
                        required
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <Label>Receive to</Label>
                {needsAccountPick ? (
                    <Popover open={openPaymentPopover} onOpenChange={setOpenPaymentPopover}>
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
                                    onClick={() => { setSelectedAccountId(a.id); setOpenPaymentPopover(false) }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                                        a.id === selectedAccountId ? 'bg-muted' : 'hover:bg-muted/50'
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                        <AccountTypeIcon type={a.type} className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{a.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatCurrency(a.balance)}</p>
                                    </div>
                                    {a.id === selectedAccountId && (
                                        <div className="w-4 h-4 rounded-full bg-orange-400 flex items-center justify-center shrink-0">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>
                ) : (
                    <div className="h-12 px-3 rounded-xl border bg-muted/50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {debt.pay_from_account && <AccountTypeIcon type={debt.pay_from_account.type} className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div>
                            <p className="text-sm font-medium">{debt.pay_from_account?.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {debt.pay_from_account && formatCurrency(debt.pay_from_account.balance)}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <Label>Payment date</Label>
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
                            {date ? format(new Date(date), 'dd MMM yyyy') : 'Pick a date'}
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Payment'}
            </Button>
        </form>
    )
}