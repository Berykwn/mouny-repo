import { useState } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountTypeTile } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { DateQuickPicker } from '@/components/date-quick-picker'
import { useAccounts } from '@/queries'
import { useSeedOnce } from '@/hooks/use-seed-once'
import { recurringBillsService } from '@/services/recurring-bills.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import type { Account, RecurringBill } from '@/types'
import { dueLabel, scheduleLabel } from '../lib/bill-labels'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

const NO_ACCOUNTS: Account[] = []

interface PayBillFormProps {
    bill: RecurringBill
    nextDue: string | null
    payPeriodId: string
    periodStart: string
    onSuccess: () => void
}

/** Records the bill's payment as an expense; the usual amount is a starting point. */
export function PayBillForm({ bill, nextDue, payPeriodId, periodStart, onSuccess }: PayBillFormProps) {
    const today = toISODate()
    const [amount, setAmount] = useState(String(Math.round(bill.amount)))
    const [date, setDate] = useState(today < periodStart ? periodStart : today)
    const [accountId, setAccountId] = useState(bill.account_id ?? '')
    const [pickerOpen, setPickerOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const { data: accountsData } = useAccounts()
    const accounts = accountsData ?? NO_ACCOUNTS
    useSeedOnce(accountsData, data => {
        if (!bill.account_id || !data.some(a => a.id === bill.account_id)) setAccountId(data[0]?.id ?? '')
    })
    const account = accounts.find(a => a.id === accountId)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const parsed = parseCurrencyInput(amount)
        if (parsed <= 0) { toast.error('Enter a valid amount.'); return }
        if (!account) { toast.error('Please select an account.'); return }
        if (parsed > account.balance) { toast.error(`Insufficient balance in ${account.name}.`); return }

        setLoading(true)
        const { error } = await recurringBillsService.pay({ bill, amount: parsed, account_id: account.id, date, pay_period_id: payPeriodId })
        setLoading(false)
        if (error) {
            toast.error(/insufficient|balance/i.test(error) ? `Insufficient balance in ${account.name}.` : error)
            return
        }
        toast.success(`${bill.name} paid.`)
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="rounded-[20px] border border-line bg-surface p-4">
                <p className="text-[11.5px] text-muted-ink">{scheduleLabel(bill)}</p>
                <p className="text-[22px] font-medium tracking-[-0.02em] text-ink mt-0.5">{formatCurrency(bill.amount)}</p>
                {nextDue && <p className="text-[11.5px] text-muted-ink mt-1">{dueLabel(nextDue)}</p>}
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Amount paid</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-ink font-medium">Rp</span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        className="pl-10 h-12 rounded-[14px] border-line text-[13px] font-mono"
                        disabled={loading}
                    />
                </div>
                <p className="text-[11px] text-subtle-ink">Change it if this month’s bill came out different.</p>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Pay from</Label>
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => setPickerOpen(true)}
                    className="w-full flex items-center justify-between px-3 h-[52px] rounded-[14px] border border-line bg-surface text-left transition-colors hover:bg-surface-soft disabled:opacity-50 disabled:pointer-events-none"
                >
                    {account ? (
                        <div className="flex items-center gap-3 min-w-0">
                            <AccountTypeTile type={account.type} savings={account.is_savings} />
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-ink truncate">{account.name}</p>
                                <p className="text-[11.5px] text-muted-ink">{formatCurrency(account.balance)}</p>
                            </div>
                        </div>
                    ) : (
                        <span className="text-[13px] text-muted-ink">Select account</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-subtle-ink shrink-0" />
                </button>
                <AccountPickerDrawer
                    open={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    accounts={accounts}
                    selectedId={accountId}
                    onSelect={(a) => { setAccountId(a.id); setPickerOpen(false) }}
                />
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Payment date</Label>
                <DateQuickPicker date={date} periodStart={periodStart} maxDate={today} onChange={setDate} disabled={loading} />
            </div>

            <button type="submit" disabled={loading} className={SUBMIT_BUTTON}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Pay ${formatCurrency(parseCurrencyInput(amount))}`}
            </button>
        </form>
    )
}
