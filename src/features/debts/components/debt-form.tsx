import { useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CalendarIcon, ChevronRight } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { useAccounts } from '@/queries'
import { Switch } from '@/components/ui/switch'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import type { Account } from '@/types'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { AccountTypeTile } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { DateQuickPicker } from '@/components/date-quick-picker'
import { cn } from '@/lib/utils'

interface DebtFormProps {
    onSuccess: () => void
    payPeriodId: string
    periodStartDate: string
    /** Which side the form opens on (e.g. from the empty state's choice). */
    initialType?: DebtType
}

type DebtType = 'debt' | 'receivable'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

const NO_ACCOUNTS: Account[] = []

export function DebtForm({ onSuccess, payPeriodId, periodStartDate, initialType = 'debt' }: DebtFormProps) {
    const today = toISODate()

    const [type, setType] = useState<DebtType>(initialType)
    const [counterparty, setCounterparty] = useState('')
    const [amount, setAmount] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [dueDateOpen, setDueDateOpen] = useState(false)
    const [date, setDate] = useState(today)
    const [accountId, setAccountId] = useState('')
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)
    const [notes, setNotes] = useState('')
    const { data: accounts = NO_ACCOUNTS } = useAccounts()
    const [loading, setLoading] = useState(false)
    // Whether this debt/receivable actually moved money in/out of the account
    const [affectsBalance, setAffectsBalance] = useState(false)

    const selectedAccount = accounts.find((a) => a.id === accountId)


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

        // The debt and, only if it actually moved money, its transfer, together. Borrowed
        // money in and lent money out only change hands: transfers, not income or spending.
        const { error } = await debtsService.create({
            type,
            counterparty: counterparty.trim(),
            total_amount: parsed,
            due_date: dueDate || null,
            notes: notes || null,
            account_id: accountId || null,
            moved: affectsBalance ? { date, pay_period_id: payPeriodId } : null,
        })

        setLoading(false)
        if (error) { toast.error(error); return }
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">

            <div className="relative flex rounded-[14px] bg-surface-hover p-1 gap-1">
                <div
                    className={cn(
                        'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[10px] bg-raised shadow-sm transition-transform duration-200 ease-out',
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
                            type === t ? 'text-ink font-semibold' : 'text-muted-ink font-medium'
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
                    className="h-12 rounded-[14px] border-line text-[13px]"
                />
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Amount</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-ink font-medium">
                        Rp
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-12 rounded-[14px] border-line text-[13px] font-mono"
                        required
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Affects balance toggle */}
            <div className={cn(
                'flex items-center justify-between rounded-[14px] border border-line p-3 gap-3',
                affectsBalance ? 'bg-surface-hover' : 'bg-surface'
            )}>
                <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-ink">Record to balance</p>
                    <p className="text-[11.5px] text-muted-ink">{affectsBalanceLabel}</p>
                </div>
                <Switch
                    checked={affectsBalance}
                    onCheckedChange={setAffectsBalance}
                    disabled={loading}
                    className="data-[state=checked]:bg-brand"
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
                                'w-full flex items-center h-12 px-3 rounded-[14px] border border-line bg-surface text-left text-[13px] transition-colors hover:bg-surface-soft disabled:opacity-50 disabled:pointer-events-none',
                                !dueDate && 'text-muted-ink'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-ink" />
                            {dueDate ? format(new Date(dueDate + 'T00:00:00'), 'dd MMM yyyy') : 'Pick a date'}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-[14px] border-line">
                        <Calendar
                            mode="single"
                            selected={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
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
                    className="h-12 rounded-[14px] border-line text-[13px]"
                />
            </div>

            <button type="submit" disabled={loading} className={SUBMIT_BUTTON}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
            </button>
        </form>
    )
}
