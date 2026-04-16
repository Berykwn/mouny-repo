import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { transactionsService } from '@/services/transactions.service'
import { accountsService } from '@/services/accounts-categories.service'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, toISODate } from '@/lib/helpers'
import type { Account } from '@/types'
import type { DebtWithAccount } from '@/types'
import { toast } from 'sonner'

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

    // Account — pre-fill from debt if available, otherwise user picks
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

        setLoading(true)

        const { error: txError } = await transactionsService.create({
            pay_period_id: payPeriodId,
            account_id: selectedAccountId,
            type: 'expense',
            amount: parsed,
            note: `Debt payment — ${debt.counterparty}`,
            date,
        })

        if (txError) { toast.error(txError); setLoading(false); return }

        const { error: debtError } = await debtsService.recordPayment(debt.id, parsed)
        setLoading(false)

        if (debtError) { toast.error(debtError); return }
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
                <Label>Pay from</Label>
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
                <Label>Payment date</Label>
                <Input
                    type="date"
                    value={date}
                    min={periodStartDate}
                    max={today}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                    Must be within {periodStartDate} — {today}
                </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Payment'}
            </Button>
        </form>
    )
}