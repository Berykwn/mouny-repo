import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ChevronRight } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { useAccounts } from '@/queries'
import { useSeedOnce } from '@/hooks/use-seed-once'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import type { Account, DebtWithAccount } from '@/types'
import { toast } from 'sonner'
import { AccountTypeTile } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { DateQuickPicker } from '@/components/date-quick-picker'
import { ProgressBar } from '@/components/progress-bar'
import { AmountChips } from './amount-chips'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

interface PayReceivableFormProps {
    debt: DebtWithAccount
    payPeriodId: string
    periodStartDate: string
    /** The payoff plan's amount for this period, offered as a quick pick. */
    plannedAmount?: number | null
    onSuccess: () => void
}

const NO_ACCOUNTS: Account[] = []

export function PayReceivableForm({ debt, periodStartDate, plannedAmount, onSuccess }: PayReceivableFormProps) {
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
        if (!selectedAccount) {
            toast.error('Account not found.')
            return
        }

        setLoading(true)

        const { error: collectError } = await debtsService.collect({
            debt_id: debt.id,
            amount: parsed,
            account: selectedAccount,
            date,
        })

        if (collectError) {
            setLoading(false)
            toast.error(collectError)
            return
        }

        setLoading(false)

        toast.success('Collection recorded.')
        onSuccess()
    }

    const collectedAmount = debt.total_amount - debt.remaining_amount
    const collectedPercent = Math.round((collectedAmount / debt.total_amount) * 100)

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="rounded-[20px] border border-line bg-surface p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11.5px] text-muted-ink">Owed by {debt.counterparty}</p>
                        <p className="text-[22px] font-medium tracking-[-0.02em] text-ink mt-0.5">{formatCurrency(debt.remaining_amount)}</p>
                    </div>
                    <p className="text-[11.5px] text-muted-ink">of {formatCurrency(debt.total_amount)}</p>
                </div>
                <div className="space-y-1">
                    <ProgressBar percent={collectedPercent} color="var(--positive)" />
                    <p className="text-[11px] text-muted-ink">{collectedPercent}% collected</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Collection amount</Label>
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
                <Label className={FIELD_LABEL}>Receive to</Label>
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
                <Label className={FIELD_LABEL}>Collection date</Label>
                <DateQuickPicker
                    date={date}
                    periodStart={periodStartDate}
                    maxDate={today}
                    onChange={setDate}
                    disabled={loading}
                />
            </div>

            <button type="submit" disabled={loading} className={SUBMIT_BUTTON}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Record Collection'}
            </button>
        </form>
    )
}
