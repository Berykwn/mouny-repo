import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar as CalendarIcon, Check, ChevronDown } from 'lucide-react'
import { AccountTypeIcon } from '@/components/account-type-icon'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { DateQuickPicker } from '@/components/date-quick-picker'
import { AmountField } from './amount-field'
import { CategoryTileRail } from './category-tile-rail'
import { ConsequenceStrip } from './consequence-strip'
import { TransferFields } from './transfer-fields'
import { ShortfallPanel } from './shortfall-panel'
import { QuickPills } from '@/features/quick-transactions/components/quick-pills'
import { QuickConfirm } from '@/features/quick-transactions/components/quick-confirm'
import { transactionsService, type CreateTransactionInput } from '@/services/transactions.service'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, formatShortCurrency, parseCurrencyInput, toISODate } from '@/lib/helpers'
import { shortDate } from '@/features/bills/lib/bill-labels'
import type { BillDue } from '@/features/bills/lib/bills'
import { summarizeTransactions } from '@/lib/period-summary'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { cn } from '@/lib/utils'
import { defaultAccount, pickerOrder, roleOf } from '@/lib/account-roles'
import { accountSubline, overspendMessage, spendErrorMessage } from '@/lib/account-spend'
import { useAccounts, useCategories, useCategoryUse, usePeriods, usePeriodTransactions, useQuickTransactions } from '@/queries'
import { useSeedOnce } from '@/hooks/use-seed-once'
import type { Account, Category, QuickTransactionWithCategory, TransactionWithDetails } from '@/types'
import { linkedTo, recentNotes, unpaidBillsFor } from '../lib/ledger'
import { byUse, type CategoryUse } from '../lib/category-order'
import { shortfallFor, type Shortfall } from '../lib/shortfall'
import { BusyLabel } from '@/components/busy-label'

type TxType = 'income' | 'expense' | 'transfer'

const NO_ACCOUNTS: Account[] = []
const NO_CATEGORIES: Category[] = []

// Phones read the form top to bottom without labels; a wide screen shows them.
const FIELD_LABEL = 'sr-only lg:not-sr-only lg:block text-[12px] font-medium text-muted-ink'
const NOTE_INPUT = 'w-full h-12 rounded-[14px] bg-surface-hover border border-transparent px-4 text-[16px] lg:text-[15px] text-ink placeholder:text-muted-ink outline-none transition-colors focus:border-line-strong disabled:opacity-60'
const OUTLINE_BUTTON = 'flex-1 h-[52px] rounded-[14px] border border-line text-[14px] font-semibold text-muted-ink transition-colors hover:bg-surface-soft hover:text-ink disabled:opacity-50 disabled:pointer-events-none'
const FILLED_BUTTON = 'flex-1 h-[52px] rounded-[14px] text-[14px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

interface AddTransactionFormProps {
    payPeriodId: string
    periodStart: string
    maxDate: string
    defaultDate?: string
    onSuccess: () => void
    /** Whether closing now would lose what's been entered. */
    onDirtyChange?: (dirty: boolean) => void
    /** Edit this transaction instead of adding a new one. */
    initial?: TransactionWithDetails
}

export function AddTransactionForm({ payPeriodId, periodStart, maxDate, defaultDate, onSuccess, onDirtyChange, initial }: AddTransactionFormProps) {
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
    // Whole rupiah: the field drops anything after a decimal point, which would read 10x too much.
    const [amount, setAmount] = useState(initial ? String(Math.round(initial.amount)) : '')
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
    // Most used first (A–Z among equals). The counts are taken once, when they first
    // load: a refetch after "Save & add another" mustn't shuffle the tiles under a finger.
    const { data: categoryUseData } = useCategoryUse()
    const [categoryUse, setCategoryUse] = useState<CategoryUse | null>(null)
    useSeedOnce(categoryUseData, setCategoryUse)
    const categories = useMemo(
        () => type === 'transfer' ? NO_CATEGORIES : byUse(typeCategories ?? NO_CATEGORIES, categoryUse),
        [type, typeCategories, categoryUse],
    )
    const { data: periodTxs } = usePeriodTransactions(payPeriodId)

    const { periods } = usePeriods()
    const periodIndex = periods.findIndex((p) => p.id === payPeriodId)
    // Quick amounts set up per category; picking one swaps the form for a short confirm.
    const { data: quicks } = useQuickTransactions()
    const [quick, setQuick] = useState<QuickTransactionWithCategory | null>(null)
    // Only the open tab's: an income amount on the Expense tab is a mis-tap waiting to happen,
    // and a transfer has no category to be quick about.
    const tabQuicks = useMemo(
        () => type === 'transfer' ? [] : (quicks ?? []).filter(q => q.category.type === type),
        [quicks, type],
    )
    // Bills still due are held back, as on the dashboard. Worked out from every transaction,
    // so editing a bill's payment doesn't count that bill as due again.
    const billReserve = useBillReserve(periodIndex >= 0 ? periods[periodIndex] : null, periodTxs)
    // The bill this expense pays, when the user says so. That link is what marks the bill
    // paid; without it the bill stays held back on top of the payment, counted twice.
    const [billId, setBillId] = useState<string | null>(null)

    // Transfer-only state
    const [fromAccountId, setFromAccountId] = useState('')
    const [toAccountId, setToAccountId] = useState('')
    const [transferAmount, setTransferAmount] = useState('')

    const amountInputRef = useRef<HTMLInputElement>(null)
    // The note comes right after the amount: Enter on the amount lands here.
    const noteInputRef = useRef<HTMLInputElement>(null)
    const focusNote = () => noteInputRef.current?.focus()

    useEffect(() => {
        if (initial) return
        setDate(resolveDate(defaultDate))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultDate, periodStart, maxDate])

    // Default accounts once they're known; later refetches mustn't undo the user's pick.
    const accountsSeeded = useRef(false)
    useEffect(() => {
        if (!accountsData || accountsSeeded.current) return
        accountsSeeded.current = true
        // The user's first everyday account, for money in and out alike. A transfer goes
        // from there to the next account in the picker's order.
        const ordered = pickerOrder(accountsData)
        const first = defaultAccount(accountsData)
        if (!initial) setAccountId(first?.id ?? '')
        setFromAccountId(first?.id ?? '')
        setToAccountId(ordered[1]?.id ?? first?.id ?? '')
        // The form is keyed per transaction, so `initial` never changes under it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountsData])

    // Default the category when the type changes (or its categories first arrive): the
    // type's most used one, the likeliest pick, so a usual entry needs no tap here. Picking
    // nothing would cost every entry a tap; picking A–Z's first (Coffee, Bonus) was wrong
    // more often than right. Not on a refetch of the same type, and never over a tile the
    // user tapped: when the counts arrive after the categories, an untouched default moves
    // to the most used, a hand-picked one stays.
    const categorySeed = useRef<{ type: TxType; withUse: boolean } | null>(null)
    const categoryPickedByHand = useRef(false)
    const pickCategory = (id: string) => {
        categoryPickedByHand.current = true
        setCategoryId(id)
    }
    useEffect(() => {
        const seeded = categorySeed.current
        if (seeded?.type !== type) categoryPickedByHand.current = false
        if (type === 'transfer') {
            categorySeed.current = { type, withUse: true }
            setCategoryId('')
            return
        }
        if (!typeCategories) return
        const withUse = !!categoryUse
        if (seeded?.type === type && (seeded.withUse || !withUse || categoryPickedByHand.current)) return
        categorySeed.current = { type, withUse }
        // Editing: keep the transaction's own category while its type is unchanged, none
        // included: an uncategorised entry isn't quietly given the first category on save.
        const keep = initial && type === initial.type
            && (!initial.category_id || typeCategories.some(c => c.id === initial.category_id))
        setCategoryId(keep ? initial.category_id ?? '' : categories[0]?.id ?? '')
        // `categories` is typeCategories ordered by categoryUse, both already deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, typeCategories, categoryUse])

    // "Left this period" baseline for the consequence strip, from the period's cached
    // transactions; the strip itself adds the in-progress amount.
    // Worked out like the dashboard's, so money moved into savings isn't counted as spendable.
    // Editing: the baseline is the period without this transaction, so the strip shows where
    // the edited version leaves you.
    const leftThisPeriod = useMemo(() => {
        if (!periodTxs) return null
        return summarizeTransactions(initial ? periodTxs.filter((t) => t.id !== initial.id) : periodTxs).net - billReserve.reserved
    }, [periodTxs, initial, billReserve.reserved])

    const selectedAccount = accounts.find((a) => a.id === accountId)
    const parsedAmount = parseCurrencyInput(amount)

    // A savings expense from an everyday account, while a savings account exists: the money
    // probably went there, which is a transfer — it stays in the balance and still counts
    // as saved.
    const selectedCategory = categories.find((c) => c.id === categoryId)
    const savingsTarget = pickerOrder(accounts).find((a) => roleOf(a) === 'savings' && a.id !== accountId)
    const suggestSavingsTransfer = !initial && type === 'expense' && !!selectedCategory?.is_savings
        && !!savingsTarget && !selectedAccount?.is_savings
    const switchToSavingsTransfer = () => {
        if (!savingsTarget) return
        if (accountId) setFromAccountId(accountId)
        setToAccountId(savingsTarget.id)
        setTransferAmount(amount)
        setType('transfer')
    }
    // Bills still due in the picked category. Offered, never assumed; an expense already
    // paying a bill keeps its link and isn't offered another.
    const billChoices = type === 'expense' && !moneyLocked && !initial?.recurring_bill_id
        ? unpaidBillsFor(billReserve.dues, categoryId)
        : []
    // A pick that no longer fits (another category or type) doesn't ride along.
    const billDue = billChoices.find((d) => d.bill.id === billId) ?? null
    // Paying it frees one due date's worth of what's held back.
    const freedReserve = billDue ? Math.min(billDue.reserved, billDue.bill.amount) : 0
    const pickBill = (due: BillDue) => {
        const on = billDue?.bill.id === due.bill.id
        setBillId(on ? null : due.bill.id)
        // A tap on the bill, with no amount typed yet, means its amount.
        if (!on && !amount) setAmount(String(Math.round(due.bill.amount)))
    }

    // What was last written for this category, from the period already loaded: offered as
    // faint text to tap, never filled in. The one already in the field isn't offered again.
    const noteSuggestions = type === 'transfer'
        ? []
        : recentNotes(periodTxs, categoryId, { exclude: initial?.id })
            .filter((n) => n.toLowerCase() !== note.trim().toLowerCase())

    // Something typed or changed that a stray tap outside the drawer would throw away.
    // Defaults the form fills in itself (date, first account and category) don't count.
    const dirty = initial
        ? amount !== String(Math.round(initial.amount))
            || note !== (initial.note ?? '')
            || date !== resolveDate(initial.date)
            || type !== initial.type
            || accountId !== initial.account_id
            || categoryId !== (initial.category_id ?? '')
            || !!billDue
        : amount !== '' || note.trim() !== '' || transferAmount !== '' || !!billDue
    useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])

    const transferFrom = accounts.find((a) => a.id === fromAccountId)
    const transferTo = accounts.find((a) => a.id === toAccountId)
    const transferSaves = !!transferTo?.is_savings && !!transferFrom && !transferFrom.is_savings
    const transferUnsaves = !!transferFrom?.is_savings && !!transferTo && !transferTo.is_savings
    const parsedTransfer = parseCurrencyInput(transferAmount)

    // More than the paying account shows: the form says so and offers a way on (see
    // ShortfallPanel) instead of only refusing on save. An expense being edited on the same
    // account gives its old amount back first, so only the difference has to be there.
    const heldBack = initial && initial.type === 'expense' && initial.account_id === accountId ? initial.amount : 0
    const shortfall: Shortfall<Account> | null = type === 'expense' && selectedAccount && !moneyLocked
        ? shortfallFor(selectedAccount, parsedAmount, accounts, { heldBack })
        : type === 'transfer' && transferFrom
            // A top-up from the account the transfer goes to would be a round trip.
            ? shortfallFor(transferFrom, parsedTransfer, accounts, { exclude: [toAccountId] })
            : null
    const [toppingUp, setToppingUp] = useState(false)

    /** What stops the entry being saved, money aside (the shortfall is checked on its own). */
    const problem = (): string | null => {
        if (type === 'transfer') {
            if (!fromAccountId) return 'Please select an account.'
            if (!toAccountId) return 'Select a destination account.'
            if (fromAccountId === toAccountId) return 'Source and destination accounts must be different.'
            if (!transferAmount || parsedTransfer <= 0) return 'Enter a valid amount.'
            if (date < periodStart || date > maxDate) return 'Pick a date in this period.'
            return null
        }
        if (!amount || parsedAmount <= 0) return 'Invalid amount.'
        if (!accountId) return 'Please select an account.'
        // An uncategorised entry being edited may stay that way; a new one needs a category.
        const staysUncategorised = !!initial && !initial.category_id && type === initial.type
        if (!categoryId && !staysUncategorised) return 'Please select a category.'
        if (date < periodStart) return `Date cannot be before period start (${periodStart}).`
        if (date > maxDate) return `Date cannot be after period end (${maxDate}).`
        return null
    }

    /**
     * The panel's "Top up … & save": move the round amount in from the fullest other
     * everyday account, dated with the entry so it lands first, then save the entry as
     * typed. Checked up front, so money isn't moved for an entry that then can't be saved.
     */
    const topUpAndSave = async () => {
        if (!shortfall?.source || shortfall.topUp === null) return
        const blocked = problem()
        if (blocked) { toast.error(blocked); return }
        const { source, account, topUp } = shortfall
        setLoading(true)
        setToppingUp(true)
        const { error } = await accountsService.transfer(source.id, account.id, topUp, date, 'Top up')
        setToppingUp(false)
        setLoading(false)
        if (error) { toast.error(spendErrorMessage(error, source)); return }
        toast.success(`Moved ${formatCurrency(topUp)} from ${source.name} to ${account.name}.`)
        // The cached balances catch up a moment later; the database checks the money itself.
        await handleSubmit('save', { toppedUp: true })
    }

    const handleSubmit = async (mode: 'save' | 'save-and-add-another', { toppedUp = false } = {}) => {
        const blocked = problem()
        if (blocked) { toast.error(blocked); return }
        if (shortfall && !toppedUp) {
            // The panel is already on screen with the ways on; the toast names the account.
            toast.error(overspendMessage(shortfall.account, Infinity) ?? `Not enough in ${shortfall.account.name}.`)
            return
        }

        if (type === 'transfer') {
            setLoading(true)
            const { error } = await accountsService.transfer(fromAccountId, toAccountId, parsedTransfer, date, note)
            setLoading(false)

            if (error) { toast.error(spendErrorMessage(error, transferFrom)); return }

            toast.success(`Transferred ${formatCurrency(parsedTransfer)} to ${transferTo?.name}.`)

            if (mode === 'save') {
                onSuccess()
                return
            }

            setTransferAmount('')
            setNote('')
            amountInputRef.current?.focus()
            return
        }

        setLoading(true)

        const input: CreateTransactionInput = {
            pay_period_id: payPeriodId,
            account_id: accountId,
            // No category goes as none at all: an empty string isn't a uuid.
            category_id: categoryId && categoryId !== 'none' ? categoryId : undefined,
            type,
            amount: parsedAmount,
            note: note || undefined,
            date,
            recurring_bill_id: billDue?.bill.id,
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
                    ...(billDue ? { recurring_bill_id: billDue.bill.id } : {}),
                })
            if (error) {
                setLoading(false)
                toast.error(spendErrorMessage(error, selectedAccount))
                return
            }
            // Replacing moves the money only; the bill link is a second write. If that one
            // fails the edit itself is saved, so say exactly that rather than "failed".
            if (moneyChanged && billDue) {
                const { error: linkError } = await transactionsService.update(initial.id, { recurring_bill_id: billDue.bill.id })
                if (linkError) {
                    setLoading(false)
                    toast.error(`Changes saved, but ${billDue.bill.name} couldn't be marked paid. Edit it again to retry.`)
                    onSuccess()
                    return
                }
            }
            setLoading(false)
            toast.success(billDue ? `Transaction updated, ${billDue.bill.name} marked paid.` : 'Transaction updated.')
            onSuccess()
            return
        }

        const { error } = await transactionsService.create(input)
        setLoading(false)

        if (error) {
            toast.error(spendErrorMessage(error, selectedAccount))
            return
        }

        toast.success(billDue ? `Saved, ${billDue.bill.name} marked paid.` : 'Saved. Noted in your ledger.')

        if (mode === 'save') {
            onSuccess()
            return
        }

        setAmount('')
        setNote('')
        setBillId(null)
        amountInputRef.current?.focus()
    }

    if (quick) {
        return (
            <QuickConfirm
                key={quick.id}
                quick={quick}
                period={{ id: payPeriodId, start_date: periodStart }}
                onDone={onSuccess}
                onBack={() => setQuick(null)}
            />
        )
    }

    const noteField = (
        <div>
            <label htmlFor="tx-note" className={cn(FIELD_LABEL, 'lg:mb-1.5')}>Note</label>
            <input
                id="tx-note"
                ref={noteInputRef}
                type="text"
                enterKeyHint="done"
                autoComplete="off"
                placeholder={type === 'transfer' ? 'Top up, rent pot, trip (optional)' : 'What was it for?'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={loading}
                className={NOTE_INPUT}
            />
            {noteSuggestions.length > 0 && (
                <div className="mt-1.5 flex items-baseline gap-x-3 gap-y-1 flex-wrap px-1 text-[12.5px]">
                    <span className="text-muted-ink">Recent{selectedCategory ? ` for ${selectedCategory.name}` : ''}:</span>
                    {noteSuggestions.map((n) => (
                        <button
                            key={n}
                            type="button"
                            disabled={loading}
                            onClick={() => { setNote(n); focusNote() }}
                            className="max-w-[180px] truncate text-muted-ink hover:text-ink underline-offset-2 hover:underline transition-colors"
                        >
                            {n}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )

    const dateRow = (
        <div className="py-3 border-t border-line-soft flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
                <CalendarIcon aria-hidden="true" className="w-4 h-4 text-muted-ink shrink-0" strokeWidth={2} />
                <span className="text-[13px] text-muted-ink">Date</span>
            </div>
            <DateQuickPicker label="Date"
                date={date}
                periodStart={periodStart}
                maxDate={maxDate}
                onChange={setDate}
                disabled={loading}
            />
        </div>
    )

    return (
        // A form, so the keyboard's Enter / Go saves.
        <form
            className="flex flex-col gap-4"
            onSubmit={(e) => { e.preventDefault(); if (!loading) void handleSubmit('save') }}
        >
            {/* Type segmented control */}
            <div role="group" aria-label="Transaction type" className="relative flex w-full rounded-[14px] bg-surface-hover p-[3px] gap-1">
                <div
                    className={cn(
                        'absolute top-[3px] bottom-[3px] rounded-[11px] bg-raised shadow-sm transition-transform duration-200 ease-out',
                        initial ? 'w-[calc((100%-4px)/2)]' : 'w-[calc((100%-8px)/3)]',
                        type === 'income' && 'translate-x-[calc(100%+4px)]',
                        type === 'transfer' && 'translate-x-[calc(200%+8px)]',
                    )}
                />
                {((initial ? ['expense', 'income'] : ['expense', 'income', 'transfer']) as TxType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        aria-pressed={type === t}
                        disabled={loading || moneyLocked}
                        onClick={() => setType(t)}
                        className={cn(
                            'relative z-10 flex-1 py-2.5 text-[13.5px] rounded-[11px] transition-colors duration-150',
                            type === t ? 'text-ink font-semibold' : 'text-muted-ink font-medium'
                        )}
                    >
                        {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'Transfer'}
                    </button>
                ))}
            </div>

            {/* Under the tabs, since they follow them: a tab's own amounts only. */}
            {!initial && tabQuicks.length > 0 && (
                <div role="group" aria-labelledby="tx-quick-amounts-label" className="space-y-1.5">
                    <Label id="tx-quick-amounts-label" className="text-[12px] font-medium text-muted-ink">Quick amounts</Label>
                    <QuickPills quicks={tabQuicks} onPick={setQuick} disabled={loading} />
                </div>
            )}

            {/* Amount, then the note, then the category */}
            {type !== 'transfer' ? (
                <>
                    <AmountField
                        id="tx-amount"
                        inputRef={amountInputRef}
                        value={amount}
                        onChange={setAmount}
                        onNext={focusNote}
                        disabled={loading || moneyLocked}
                        // A new entry starts with the amount, so the keypad comes up with the
                        // drawer. Editing usually fixes something else: no keyboard uninvited.
                        autoFocus={!initial}
                    />

                    {noteField}

                    <div role="group" aria-labelledby="tx-category-label" className="space-y-1.5">
                        <Label id="tx-category-label" className={FIELD_LABEL}>Category</Label>
                        <CategoryTileRail
                            categories={categories}
                            selectedId={categoryId || null}
                            onSelect={pickCategory}
                            disabled={loading}
                        />
                    </div>

                    {/* Asked, never assumed: only the user knows this expense is the bill */}
                    {billChoices.length > 0 && (
                        <div role="group" aria-label="Bill this pays" className="space-y-2">
                            {billChoices.map((d) => {
                                const on = billDue?.bill.id === d.bill.id
                                return (
                                    <button
                                        key={d.bill.id}
                                        type="button"
                                        role="checkbox"
                                        aria-checked={on}
                                        disabled={loading}
                                        onClick={() => pickBill(d)}
                                        className={cn(
                                            'w-full flex items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left transition-colors disabled:opacity-50',
                                            on ? 'border-brand bg-brand-tint' : 'border-line bg-surface hover:bg-surface-soft'
                                        )}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0',
                                                on ? 'bg-brand border-brand text-on-brand' : 'border-line-strong bg-surface'
                                            )}
                                        >
                                            {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[13.5px] font-semibold text-ink truncate">
                                                Pays {d.bill.name} <span className="font-normal text-muted-ink">· {formatShortCurrency(d.bill.amount)}</span>
                                            </span>
                                            <span className="block text-[12px] text-muted-ink">
                                                {d.nextDue ? `Due ${shortDate(d.nextDue)} · ` : ''}stops being held back
                                            </span>
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {suggestSavingsTransfer && (
                        <div className="rounded-[14px] bg-line-soft px-3.5 py-3 text-[12px] text-muted-ink leading-relaxed">
                            Putting it into {savingsTarget!.name}? Record it as a transfer instead: the money stays in your balance and still counts as saved.
                            <button
                                type="button"
                                onClick={switchToSavingsTransfer}
                                disabled={loading}
                                className="mt-1.5 block font-semibold underline underline-offset-2"
                            >
                                Transfer to {savingsTarget!.name}
                            </button>
                        </div>
                    )}

                    {/* Account and date */}
                    <div className="flex flex-col">
                        <button
                            type="button"
                            disabled={loading || moneyLocked}
                            onClick={() => setAccountPickerOpen(true)}
                            className="flex items-center gap-2.5 py-3 border-t border-line-soft text-left w-full disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <AccountTypeIcon type={selectedAccount?.type ?? 'cash'} savings={selectedAccount?.is_savings} role={selectedAccount?.role} className="w-[18px] h-[18px] shrink-0" />
                            <span className="text-[13px] text-muted-ink shrink-0">{type === 'income' ? 'Into' : 'Paid from'}</span>
                            <span className="ml-auto flex items-center gap-1.5 min-w-0">
                                <span className="flex flex-col items-end min-w-0">
                                    <span className="text-[13.5px] font-medium text-ink truncate max-w-[160px]">
                                        {selectedAccount?.name ?? 'Select'}
                                    </span>
                                    {selectedAccount && (
                                        <span className="text-[11.5px] text-muted-ink tabular-nums">{accountSubline(selectedAccount)}</span>
                                    )}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-subtle-ink shrink-0" />
                            </span>
                        </button>

                        {dateRow}
                    </div>

                    {shortfall && (
                        <ShortfallPanel shortfall={shortfall} then="save" onTopUp={() => void topUpAndSave()} busy={loading} toppingUp={toppingUp} />
                    )}

                    {/* Live consequence */}
                    {leftThisPeriod !== null && parsedAmount > 0 && (
                        <ConsequenceStrip
                            leftThisPeriod={leftThisPeriod}
                            amount={parsedAmount}
                            type={type}
                            freed={freedReserve}
                            billName={billDue?.bill.name}
                        />
                    )}
                </>
            ) : (
                <>
                    <AmountField
                        id="transfer-amount"
                        inputRef={amountInputRef}
                        value={transferAmount}
                        onChange={setTransferAmount}
                        onNext={focusNote}
                        disabled={loading}
                    />

                    {noteField}

                    <TransferFields
                        accounts={accounts}
                        fromAccountId={fromAccountId}
                        toAccountId={toAccountId}
                        amount={transferAmount}
                        onFromChange={setFromAccountId}
                        onToChange={setToAccountId}
                        disabled={loading}
                    />

                    {/* A transfer made yesterday belongs to yesterday, like any other entry. */}
                    {dateRow}

                    {shortfall && (
                        <ShortfallPanel shortfall={shortfall} then="transfer" onTopUp={() => void topUpAndSave()} busy={loading} toppingUp={toppingUp} />
                    )}

                    {(transferSaves || transferUnsaves) && (
                        <p className="rounded-[14px] bg-line-soft px-3.5 py-3 text-[12px] text-muted-ink leading-relaxed">
                            {transferSaves
                                ? `${transferTo!.name} is a savings account, so this counts as saved this period.`
                                : `${transferFrom!.name} is a savings account, so this takes it off what you’ve saved this period.`}
                        </p>
                    )}
                </>
            )}

            {linked && (
                <p className="rounded-[14px] bg-surface-soft border border-line-soft px-3.5 py-3 text-[12px] text-muted-ink leading-relaxed">
                    This is a {linked === 'wish' ? 'wish list' : 'debt'} payment, so its amount and account stay in step with that record.
                    You can still change the note, date and category.
                </p>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
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
                    type="submit"
                    disabled={loading}
                    className={FILLED_BUTTON}
                >
                    <BusyLabel busy={loading} className="mx-auto">{type === 'transfer' ? 'Transfer' : billDue ? 'Save & mark paid' : initial ? 'Save changes' : 'Save'}</BusyLabel>
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
        </form>
    )
}
