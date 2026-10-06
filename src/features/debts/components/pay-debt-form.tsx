import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ChevronRight } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { useAccounts } from '@/queries'
import { useSeedOnce } from '@/hooks/use-seed-once'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import type { Account } from '@/types'
import type { DebtWithAccount } from '@/types'
import { toast } from 'sonner'
import { AccountTypeTile } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { DateQuickPicker } from '@/components/date-quick-picker'
import { ProgressBar } from '@/components/progress-bar'
import { AmountChips } from './amount-chips'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

interface PayDebtFormProps {
    debt: DebtWithAccount
    payPeriodId: string
    periodStartDate: string
    /** The payoff plan's amount for this period, offered as a quick pick. */
    plannedAmount?: number | null
    onSuccess: () => void
}

const NO_ACCOUNTS: Account[] = []

export function PayDebtForm({ debt, payPeriodId, periodStartDate, plannedAmount, onSuccess }: PayDebtFormProps) {
    const today = toISODate()

    const [amount, setAmount] = useState(String(Math.round(debt.remaining_amount)))
    const [date, setDate] = useState(today)
    const [loading, setLoading] = useState(false)
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)

    const { data: accountsData } = useAccounts()
    const accounts = accountsData ?? NO_ACCOUNTS
    const [selectedAccountId, setSelectedAccountId] = useState<string>(
        debt.pay_from_account_id ?? ''
    )

    useSeedOnce(accountsData, data => {
        if (!debt.pay_from_account_id) setSelectedAccountId(data[0]?.id ?? '')
    })

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
        if (parsed > selectedAccount.balance) {
            toast.error(`Insufficient balance in ${selectedAccount.name}.`)
            return
        }

        setLoading(true)

        const { data: category, error: catError } = await debtsService.findOrCreateCategory('Debt Payment')

        if (catError || !category) {
            toast.error('Failed to resolve category.')
            setLoading(false)
            return
        }

        const { error: payError } = await debtsService.pay({
            debt_id: debt.id,
            amount: parsed,
            account_id: selectedAccountId,
            date,
            pay_period_id: payPeriodId,
            category_id: category.id,
            note: `Debt payment — ${debt.counterparty}`,
        })

        if (payError) {
            toast.error(/insufficient|balance/i.test(payError) ? `Insufficient balance in ${selectedAccount.name}.` : payError)
            setLoading(false)
            return
        }

        setLoading(false)

        toast.success('Debt payment recorded.')
        onSuccess()
    }

    const paidAmount = debt.total_amount - debt.remaining_amount
    const paidPercent = Math.round((paidAmount / debt.total_amount) * 100)

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="rounded-[20px] border border-line bg-surface p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11.5px] text-muted-ink">Owed to {debt.counterparty}</p>
                        <p className="text-[22px] font-medium tracking-[-0.02em] text-ink mt-0.5">{formatCurrency(debt.remaining_amount)}</p>
                    </div>
                    <p className="text-[11.5px] text-muted-ink">of {formatCurrency(debt.total_amount)}</p>
                </div>
                <div className="space-y-1">
                    <ProgressBar percent={paidPercent} />
                    <p className="text-[11px] text-muted-ink">{paidPercent}% paid</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Payment amount</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-ink font-medium">
                        Rp
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-12 rounded-[14px] border-line text-[13px] font-mono"
                        required
                        disabled={loading}
                    />
                </div>
                <AmountChips
                    remaining={debt.remaining_amount}
                    planned={plannedAmount}
                    value={parseCurrencyInput(amount)}
                    onPick={(n) => setAmount(String(n))}
                    disabled={loading}
                />
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Pay from</Label>
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
                                <p className="text-[13px] font-medium text-ink truncate">{selectedAccount.name}</p>
                                <p className="text-[11.5px] text-muted-ink">{formatCurrency(selectedAccount.balance)}</p>
                            </div>
                        </div>
                    ) : (
                        <span className="text-[13px] text-muted-ink">Select account</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-subtle-ink shrink-0" />
                </button>
                <AccountPickerDrawer
                    open={accountPickerOpen}
                    onClose={() => setAccountPickerOpen(false)}
                    accounts={accounts}
                    selectedId={selectedAccountId}
                    onSelect={(a) => { setSelectedAccountId(a.id); setAccountPickerOpen(false) }}
                />
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Payment date</Label>
                <DateQuickPicker
                    date={date}
                    periodStart={periodStartDate}
                    maxDate={today}
                    onChange={setDate}
                    disabled={loading}
                />
            </div>

            <button type="submit" disabled={loading} className={SUBMIT_BUTTON}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Record Payment'}
            </button>
        </form>
    )
}
