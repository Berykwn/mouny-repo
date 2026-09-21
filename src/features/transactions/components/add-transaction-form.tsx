import { useEffect, useRef, useState } from 'react'
import { Calendar as CalendarIcon, ChevronDown, Loader2, Pencil, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { DateQuickPicker } from '@/components/date-quick-picker'
import { CategoryTileRail } from './category-tile-rail'
import { ConsequenceStrip } from './consequence-strip'
import { TransferFields } from './transfer-fields'
import { transactionsService, type CreateTransactionInput } from '@/services/transactions.service'
import { accountsService, categoriesService } from '@/services/accounts-categories.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import { emitTransactionsChanged } from '@/lib/transactions-bus'
import { cn } from '@/lib/utils'
import type { Account, Category } from '@/types'

type TxType = 'income' | 'expense' | 'transfer'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'
const OUTLINE_BUTTON = 'flex-1 h-[52px] rounded-[14px] border border-[#e5e5e5] text-[14px] font-semibold text-[#5b5b55] transition-colors hover:bg-[#fbfbfa] disabled:opacity-50 disabled:pointer-events-none'
const FILLED_BUTTON = 'flex-1 h-[52px] rounded-[14px] text-[14px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

interface AddTransactionFormProps {
    payPeriodId: string
    periodStart: string
    maxDate: string
    defaultDate?: string
    onClose: () => void
    onSuccess: () => void
}

export function AddTransactionForm({ payPeriodId, periodStart, maxDate, defaultDate, onClose, onSuccess }: AddTransactionFormProps) {
    const today = toISODate()

    const resolveDate = (d?: string) => {
        const target = d ?? today
        if (target < periodStart) return periodStart
        if (target > maxDate) return maxDate
        return target
    }

    const [type, setType] = useState<TxType>('expense')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [date, setDate] = useState(resolveDate(defaultDate))
    const [accountId, setAccountId] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [safeToSpend, setSafeToSpend] = useState<number | null>(null)

    // Transfer-only state
    const [fromAccountId, setFromAccountId] = useState('')
    const [toAccountId, setToAccountId] = useState('')
    const [transferAmount, setTransferAmount] = useState('')

    const amountInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setDate(resolveDate(defaultDate))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultDate, periodStart, maxDate])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    useEffect(() => {
        accountsService.getAll().then(({ data }) => {
            if (data) {
                setAccounts(data)
                setAccountId(data[0]?.id ?? '')
                setFromAccountId(data[0]?.id ?? '')
                setToAccountId(data[1]?.id ?? data[0]?.id ?? '')
            }
        })
    }, [])

    useEffect(() => {
        if (type === 'transfer') {
            setCategories([])
            setCategoryId('')
            return
        }
        categoriesService.getByType(type).then(({ data }) => {
            if (data && data.length > 0) {
                setCategories(data)
                setCategoryId(data[0].id)
            } else {
                setCategories([])
                setCategoryId('')
            }
        })
    }, [type])

    // Live "safe to spend" baseline for the consequence strip. Fetched once (and on
    // period change) rather than per keystroke — the strip itself recomputes the
    // "after" value cheaply from this baseline + the in-progress amount.
    useEffect(() => {
        let cancelled = false
        transactionsService.getByPeriod(payPeriodId).then(({ data }) => {
            if (cancelled || !data) return
            const totalIncome = data.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
            const totalExpense = data.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            setSafeToSpend(totalIncome - totalExpense)
        })
        return () => { cancelled = true }
    }, [payPeriodId])

    const selectedAccount = accounts.find((a) => a.id === accountId)
    const parsedAmount = parseCurrencyInput(amount)

    const handleSubmit = async (mode: 'save' | 'save-and-add-another') => {
        if (type === 'transfer') {
            if (!fromAccountId) { toast.error('Please select an account.'); return }
            if (!toAccountId) { toast.error('Select a destination account.'); return }
            if (fromAccountId === toAccountId) { toast.error('Source and destination accounts must be different.'); return }

            const parsedTransfer = parseCurrencyInput(transferAmount)
            if (!transferAmount || parsedTransfer <= 0) { toast.error('Enter a valid amount.'); return }

            const fromAccount = accounts.find((a) => a.id === fromAccountId)
            if (fromAccount && parsedTransfer > fromAccount.balance) { toast.error('Insufficient balance.'); return }

            setLoading(true)
            const { error } = await accountsService.transfer(fromAccountId, toAccountId, parsedTransfer)
            setLoading(false)

            if (error) { toast.error(error); return }

            const toAccount = accounts.find((a) => a.id === toAccountId)
            toast.success(`Transferred ${formatCurrency(parsedTransfer)} to ${toAccount?.name}.`)

            if (mode === 'save') {
                onSuccess()
                return
            }

            setTransferAmount('')
            setAccounts((prev) => prev.map((a) => {
                if (a.id === fromAccountId) return { ...a, balance: a.balance - parsedTransfer }
                if (a.id === toAccountId) return { ...a, balance: a.balance + parsedTransfer }
                return a
            }))
            emitTransactionsChanged()
            return
        }

        if (!amount || parsedAmount <= 0) {
            toast.error('Invalid amount.')
            return
        }
        if (!accountId) {
            toast.error('Please select an account.')
            return
        }
        if (!categoryId) {
            toast.error('Please select a category.')
            return
        }
        if (date < periodStart) {
            toast.error(`Date cannot be before period start (${periodStart}).`)
            return
        }
        if (date > maxDate) {
            toast.error(`Date cannot be after period end (${maxDate}).`)
            return
        }

        setLoading(true)

        const input: CreateTransactionInput = {
            pay_period_id: payPeriodId,
            account_id: accountId,
            category_id: categoryId === 'none' ? undefined : categoryId,
            type,
            amount: parsedAmount,
            note: note || undefined,
            date,
        }

        const { error } = await transactionsService.create(input)
        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success('Transaction saved successfully.')

        if (mode === 'save') {
            onSuccess()
            return
        }

        const submittedType = type
        const submittedAmount = parsedAmount
        setAmount('')
        setNote('')
        setSafeToSpend((prev) => prev === null
            ? prev
            : (submittedType === 'expense' ? prev - submittedAmount : prev + submittedAmount)
        )
        emitTransactionsChanged()
        amountInputRef.current?.focus()
    }

    return (
        <div className="flex flex-col gap-[18px]">
            {/* Type segmented control */}
            <div className="relative flex w-full rounded-xl bg-[#f4f4f2] p-[3px] gap-1">
                <div
                    className={cn(
                        'absolute top-[3px] bottom-[3px] w-[calc((100%-8px)/3)] rounded-[9px] bg-white shadow-sm transition-transform duration-200 ease-out',
                        type === 'income' && 'translate-x-[calc(100%+4px)]',
                        type === 'transfer' && 'translate-x-[calc(200%+8px)]',
                    )}
                />
                {(['expense', 'income', 'transfer'] as TxType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        disabled={loading}
                        onClick={() => setType(t)}
                        className={cn(
                            'relative z-10 flex-1 py-2 text-[13px] rounded-[9px] transition-colors duration-150',
                            type === t ? 'text-[#252525] font-semibold' : 'text-[#8a8a84] font-medium'
                        )}
                    >
                        {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'Transfer'}
                    </button>
                ))}
            </div>

            {type !== 'transfer' ? (
                <>
                    {/* Amount */}
                    <div className="space-y-1.5">
                        <Label className={FIELD_LABEL}>Amount</Label>
                        <div className="flex items-baseline gap-1.5 border-b border-[#e5e5e5] pb-2">
                            <span className="text-[20px] font-medium text-[#b0b0aa]">Rp</span>
                            <input
                                ref={amountInputRef}
                                type="text"
                                inputMode="numeric"
                                value={formatCurrencyInput(amount)}
                                onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                placeholder="0"
                                disabled={loading}
                                className="flex-1 min-w-0 bg-transparent outline-none text-[34px] font-medium tracking-[-0.02em] text-[#252525] placeholder:text-[#b0b0aa]"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <Label className={FIELD_LABEL}>Category</Label>
                        <CategoryTileRail
                            categories={categories}
                            selectedId={categoryId || null}
                            onSelect={setCategoryId}
                            disabled={loading}
                        />
                    </div>

                    {/* Account / Date / Note rows */}
                    <div className="flex flex-col">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => setAccountPickerOpen(true)}
                            className="flex items-center gap-2.5 py-[13px] text-left w-full disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <Wallet className="w-4 h-4 text-[#8a8a84] shrink-0" strokeWidth={2} />
                            <span className="text-[13px] text-[#8a8a84] shrink-0">Account</span>
                            <span className="ml-auto flex items-center gap-1.5 min-w-0">
                                <span className="flex flex-col items-end min-w-0">
                                    <span className="text-[13.5px] font-medium text-[#252525] truncate max-w-[160px]">
                                        {selectedAccount?.name ?? 'Select'}
                                    </span>
                                    {selectedAccount && (
                                        <span className="text-[11.5px] text-[#b0b0aa]">{formatCurrency(selectedAccount.balance)}</span>
                                    )}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-[#a3a3a3] shrink-0" />
                            </span>
                        </button>

                        <div className="py-[13px] border-t border-[#f2f2f0] flex flex-col gap-2">
                            <div className="flex items-center gap-2.5">
                                <CalendarIcon className="w-4 h-4 text-[#8a8a84] shrink-0" strokeWidth={2} />
                                <span className="text-[13px] text-[#8a8a84]">Date</span>
                            </div>
                            <DateQuickPicker
                                date={date}
                                periodStart={periodStart}
                                maxDate={maxDate}
                                onChange={setDate}
                                disabled={loading}
                            />
                        </div>

                        <div className="py-[13px] border-t border-[#f2f2f0] flex flex-col gap-2">
                            <div className="flex items-center gap-2.5">
                                <Pencil className="w-4 h-4 text-[#8a8a84] shrink-0" strokeWidth={2} />
                                <span className="text-[13px] text-[#8a8a84]">Note</span>
                            </div>
                            <Input
                                type="text"
                                placeholder="Lunch, fuel, etc (optional)"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={loading}
                                className="h-11 rounded-[12px] border-[#e5e5e5] text-[13.5px]"
                            />
                        </div>
                    </div>

                    {/* Live consequence */}
                    {safeToSpend !== null && parsedAmount > 0 && (
                        <ConsequenceStrip safeToSpend={safeToSpend} amount={parsedAmount} type={type} />
                    )}
                </>
            ) : (
                <TransferFields
                    accounts={accounts}
                    fromAccountId={fromAccountId}
                    toAccountId={toAccountId}
                    amount={transferAmount}
                    onFromChange={setFromAccountId}
                    onToChange={setToAccountId}
                    onAmountChange={setTransferAmount}
                    disabled={loading}
                />
            )}

            {/* Actions */}
            <div className="flex gap-2.5">
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSubmit('save-and-add-another')}
                    className={OUTLINE_BUTTON}
                >
                    Save &amp; add another
                </button>
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSubmit('save')}
                    className={FILLED_BUTTON}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                </button>
            </div>

            <AccountPickerDrawer
                open={accountPickerOpen}
                onClose={() => setAccountPickerOpen(false)}
                accounts={accounts}
                selectedId={accountId}
                onSelect={(account) => {
                    setAccountId(account.id)
                    setAccountPickerOpen(false)
                }}
            />
        </div>
    )
}
