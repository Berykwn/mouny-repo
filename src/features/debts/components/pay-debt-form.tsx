import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ChevronRight } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { transactionsService } from '@/services/transactions.service'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import type { Account } from '@/types'
import type { DebtWithAccount } from '@/types'
import { toast } from 'sonner'
import { AccountTypeIcon } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { DateQuickPicker } from '@/components/date-quick-picker'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

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
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)

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
            <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11.5px] text-[#8a8a84]">Owed to {debt.counterparty}</p>
                        <p className="text-[22px] font-medium tracking-[-0.02em] text-[#252525] mt-0.5">{formatCurrency(debt.remaining_amount)}</p>
                    </div>
                    <p className="text-[11.5px] text-[#8a8a84]">of {formatCurrency(debt.total_amount)}</p>
                </div>
                <div className="space-y-1">
                    <div className="h-1 bg-[#f2f2f0] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${paidPercent}%`, backgroundColor: '#6FA82B' }}
                        />
                    </div>
                    <p className="text-[11px] text-[#8a8a84]">{paidPercent}% paid</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Payment amount</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a84] font-medium">
                        Rp
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                        required
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Receive to</Label>
                {needsAccountPick ? (
                    <>
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
                            selectedId={selectedAccountId}
                            onSelect={(a) => { setSelectedAccountId(a.id); setAccountPickerOpen(false) }}
                        />
                    </>
                ) : (
                    <div className="h-[52px] px-3 rounded-[14px] border border-[#e5e5e5] bg-[#f4f4f2] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-white flex items-center justify-center shrink-0">
                            {debt.pay_from_account && <AccountTypeIcon type={debt.pay_from_account.type} className="w-4 h-4 text-[#8a8a84]" />}
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-[#252525]">{debt.pay_from_account?.name}</p>
                            <p className="text-[11.5px] text-[#8a8a84]">
                                {debt.pay_from_account && formatCurrency(debt.pay_from_account.balance)}
                            </p>
                        </div>
                    </div>
                )}
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
