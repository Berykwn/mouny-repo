import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CalendarIcon, ChevronRight } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { transactionsService } from '@/services/transactions.service'
import { accountsService } from '@/services/accounts-categories.service'
import { Switch } from '@/components/ui/switch'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import type { Account } from '@/types'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { AccountTypeIcon } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { DateQuickPicker } from '@/components/date-quick-picker'
import { cn } from '@/lib/utils'

interface DebtFormProps {
    onSuccess: () => void
    payPeriodId: string
    periodStartDate: string
}

type DebtType = 'debt' | 'receivable'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

export function DebtForm({ onSuccess, payPeriodId, periodStartDate }: DebtFormProps) {
    const today = toISODate()

    const [type, setType] = useState<DebtType>('debt')
    const [counterparty, setCounterparty] = useState('')
    const [amount, setAmount] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [dueDateOpen, setDueDateOpen] = useState(false)
    const [date, setDate] = useState(today)
    const [accountId, setAccountId] = useState('')
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)
    const [notes, setNotes] = useState('')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(false)
    // Whether this debt/receivable actually moved money in/out of the account
    const [affectsBalance, setAffectsBalance] = useState(false)

    const selectedAccount = accounts.find((a) => a.id === accountId)

    useEffect(() => {
        accountsService.getAll().then(({ data }) => {
            if (data) setAccounts(data)
        })
    }, [])

    // Reset affectsBalance when type changes so user consciously opts in
    const handleTypeChange = (val: DebtType) => {
        setType(val)
        setAffectsBalance(false)
    }

    // Label helpers based on type
    const affectsBalanceLabel = type === 'debt'
        ? 'Money received into account (e.g. borrowed cash)'
        : 'Money sent out of account (e.g. lent cash)'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsed = parseCurrencyInput(amount)
        if (!amount || parsed <= 0) {
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

            <div className="relative flex rounded-[14px] bg-[#f4f4f2] p-1 gap-1">
                <div
                    className={cn(
                        'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[10px] bg-white shadow-sm transition-transform duration-200 ease-out',
                        type === 'receivable' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                    )}
                />
                {(['debt', 'receivable'] as DebtType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => handleTypeChange(t)}
                        className={cn(
                            'relative z-10 flex-1 py-2 text-[13px] rounded-[10px] transition-colors duration-150',
                            type === t ? 'text-[#252525] font-semibold' : 'text-[#8a8a84] font-medium'
                        )}
                    >
                        {t === 'debt' ? 'Debt' : 'Receivable'}
                    </button>
                ))}
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>{type === 'debt' ? 'Lender name' : 'Borrower name'}</Label>
                <Input
                    placeholder="e.g. John Doe"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                />
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Amount</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a84] font-medium">
                        Rp
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                        required
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Affects balance toggle */}
            <div className={cn(
                'flex items-center justify-between rounded-[14px] border border-[#e5e5e5] p-3 gap-3',
                affectsBalance ? 'bg-[#f4f4f2]' : 'bg-white'
            )}>
                <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-[#252525]">Record to balance</p>
                    <p className="text-[11.5px] text-[#8a8a84]">{affectsBalanceLabel}</p>
                </div>
                <Switch
                    checked={affectsBalance}
                    onCheckedChange={setAffectsBalance}
                    disabled={loading}
                    className="data-[state=checked]:bg-[#6FA82B]"
                />
            </div>

            {/* Account & date only shown if affects balance */}
            {affectsBalance && (
                <>
                    <div className="space-y-1.5">
                        <Label className={FIELD_LABEL}>Account</Label>
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
                            selectedId={accountId}
                            onSelect={(a) => { setAccountId(a.id); setAccountPickerOpen(false) }}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className={FIELD_LABEL}>Transaction date</Label>
                        <DateQuickPicker
                            date={date}
                            periodStart={periodStartDate}
                            maxDate={today}
                            onChange={setDate}
                            disabled={loading}
                        />
                    </div>
                </>
            )}

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Due date <span className="normal-case tracking-normal font-normal">(optional)</span></Label>
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            disabled={loading}
                            className={cn(
                                'w-full flex items-center h-12 px-3 rounded-[14px] border border-[#e5e5e5] bg-white text-left text-[13px] transition-colors hover:bg-[#fbfbfa] disabled:opacity-50 disabled:pointer-events-none',
                                !dueDate && 'text-[#8a8a84]'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 text-[#8a8a84]" />
                            {dueDate ? format(new Date(dueDate), 'dd MMM yyyy') : 'Pick a date'}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-[14px] border-[#e5e5e5]">
                        <Calendar
                            mode="single"
                            selected={dueDate ? new Date(dueDate) : undefined}
                            onSelect={(d) => {
                                if (!d) return
                                setDueDate(format(d, 'yyyy-MM-dd'))
                                setDueDateOpen(false)
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Note <span className="normal-case tracking-normal font-normal">(optional)</span></Label>
                <Input
                    placeholder="Details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                />
            </div>

            <button type="submit" disabled={loading} className={SUBMIT_BUTTON}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
            </button>
        </form>
    )
}
