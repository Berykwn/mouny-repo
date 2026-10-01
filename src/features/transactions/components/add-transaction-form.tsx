import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar as CalendarIcon, ChevronDown, Loader2, Pencil } from 'lucide-react'
import { AccountTypeIcon } from '@/components/account-type-icon'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { DateQuickPicker } from '@/components/date-quick-picker'
import { CategoryTileRail } from './category-tile-rail'
import { ConsequenceStrip } from './consequence-strip'
import { TransferFields } from './transfer-fields'
import { transactionsService, type CreateTransactionInput } from '@/services/transactions.service'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { useAccounts, useCategories, usePeriodTransactions } from '@/queries'
import type { Account, Category, TransactionWithDetails } from '@/types'
import { linkedTo } from '../lib/ledger'

type TxType = 'income' | 'expense' | 'transfer'

const NO_ACCOUNTS: Account[] = []
const NO_CATEGORIES: Category[] = []

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
    /** Edit this transaction instead of adding a new one. */
    initial?: TransactionWithDetails
}

export function AddTransactionForm({ payPeriodId, periodStart, maxDate, defaultDate, onClose, onSuccess, initial }: AddTransactionFormProps) {
    // A wish or debt payment's amount, account and type belong to that record; only the
    // note, date and category can change here without the two falling out of step.
    const linked = initial ? linkedTo(initial) : null
    const moneyLocked = !!linked
    const today = toISODate()

    const resolveDate = (d?: string) => {
        const target = d ?? today
        if (target < periodStart) return periodStart
        if (target > maxDate) return maxDate
        return target
    }

    const [type, setType] = useState<TxType>((initial?.type as TxType | undefined) ?? 'expense')
    const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
    const [note, setNote] = useState(initial?.note ?? '')
    const [date, setDate] = useState(resolveDate(initial?.date ?? defaultDate))
    const [accountId, setAccountId] = useState(initial?.account_id ?? '')
    const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // From the shared cache (prefetched by the layout), so the form opens filled in, and
    // balances update by themselves after a transfer.
    const { data: accountsData } = useAccounts()
    const accounts = accountsData ?? NO_ACCOUNTS
    const { data: typeCategories } = useCategories(type === 'transfer' ? null : type)
    const categories = type === 'transfer' ? NO_CATEGORIES : typeCategories ?? NO_CATEGORIES
    const { data: periodTxs } = usePeriodTransactions(payPeriodId)

    // Transfer-only state
    const [fromAccountId, setFromAccountId] = useState('')
    const [toAccountId, setToAccountId] = useState('')
    const [transferAmount, setTransferAmount] = useState('')

    const amountInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (initial) return
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

    // Default accounts once they're known; later refetches mustn't undo the user's pick.
    const accountsSeeded = useRef(false)
    useEffect(() => {
        if (!accountsData || accountsSeeded.current) return
        accountsSeeded.current = true
        if (!initial) setAccountId(accountsData[0]?.id ?? '')
        setFromAccountId(accountsData[0]?.id ?? '')
        setToAccountId(accountsData[1]?.id ?? accountsData[0]?.id ?? '')
        // The form is keyed per transaction, so `initial` never changes under it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountsData])

    // Default the category when the type changes (or its categories first arrive), but
    // not on a refetch of the same type, which would undo the user's pick.
    const categoriesSeededFor = useRef<TxType | null>(null)
    useEffect(() => {
        if (type === 'transfer') {
            categoriesSeededFor.current = type
            setCategoryId('')
            return
        }
        if (!typeCategories || categoriesSeededFor.current === type) return
        categoriesSeededFor.current = type
        // Editing: keep the transaction's own category while its type is unchanged.
        const keep = initial && type === initial.type && typeCategories.some(c => c.id === initial.category_id)
        setCategoryId(keep ? initial.category_id! : typeCategories[0]?.id ?? '')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, typeCategories])

    // "Safe to spend" baseline for the consequence strip, from the period's cached
    // transactions; the strip itself adds the in-progress amount.
    const safeToSpend = useMemo(() => {
        if (!periodTxs) return null
        const totalIncome = periodTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const totalExpense = periodTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        // Editing: the baseline is the period without this transaction, so the strip
        // shows where the edited version leaves you.
        const own = initial ? (initial.type === 'income' ? -initial.amount : initial.amount) : 0
        return totalIncome - totalExpense + own
    }, [periodTxs, initial])

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

        if (initial) {
            const moneyChanged = parsedAmount !== initial.amount
                || accountId !== initial.account_id
                || type !== initial.type
            const { error } = moneyChanged
                ? await transactionsService.replace(initial, input)
                : await transactionsService.updateDetails(initial.id, {
                    category_id: input.category_id ?? null,
                    note: note || null,
                    date,
                })
            setLoading(false)
            if (error) {
                toast.error(/insufficient|balance/i.test(error) ? `Insufficient balance in ${selectedAccount?.name ?? 'that account'}.` : error)
                return
            }
            toast.success('Transaction updated.')
            onSuccess()
            return
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

        setAmount('')
        setNote('')
        amountInputRef.current?.focus()
    }

    return (
        <div className="flex flex-col gap-[18px]">
            {/* Type segmented control */}
            <div className="relative flex w-full rounded-xl bg-[#f4f4f2] p-[3px] gap-1">
                <div
                    className={cn(
                        'absolute top-[3px] bottom-[3px] rounded-[9px] bg-white shadow-sm transition-transform duration-200 ease-out',
                        initial ? 'w-[calc((100%-4px)/2)]' : 'w-[calc((100%-8px)/3)]',
                        type === 'income' && 'translate-x-[calc(100%+4px)]',
                        type === 'transfer' && 'translate-x-[calc(200%+8px)]',
                    )}
                />
                {((initial ? ['expense', 'income'] : ['expense', 'income', 'transfer']) as TxType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        disabled={loading || moneyLocked}
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
                                disabled={loading || moneyLocked}
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
                            disabled={loading || moneyLocked}
                            onClick={() => setAccountPickerOpen(true)}
                            className="flex items-center gap-2.5 py-[13px] text-left w-full disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <AccountTypeIcon type={selectedAccount?.type ?? 'cash'} className="w-[18px] h-[18px] shrink-0" />
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

            {linked && (
                <p className="rounded-xl bg-surface-soft border border-line-soft px-3.5 py-3 text-[12px] text-muted-ink leading-relaxed">
                    This is a {linked === 'wish' ? 'wish list' : 'debt'} payment, so its amount and account stay in step with that record.
                    You can still change the note, date and category.
                </p>
            )}

            {/* Actions */}
            <div className="flex gap-2.5">
                {!initial && (
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSubmit('save-and-add-another')}
                        className={OUTLINE_BUTTON}
                    >
                        Save &amp; add another
                    </button>
                )}
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSubmit('save')}
                    className={FILLED_BUTTON}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : initial ? 'Save changes' : 'Save'}
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
