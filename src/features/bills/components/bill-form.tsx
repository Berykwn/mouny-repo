import { useState } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountTypeTile } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { CategoryTileRail } from '@/features/transactions/components/category-tile-rail'
import { useAccounts, useCategories } from '@/queries'
import { useSeedOnce } from '@/hooks/use-seed-once'
import { recurringBillsService, type BillInput } from '@/services/recurring-bills.service'
import { resolveCategoryKind } from '@/lib/category-kind'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account, BillFrequency, BillKind, Category, RecurringBill } from '@/types'
import { MONTH_NAMES } from '../lib/bill-labels'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'
const FIELD = 'h-12 rounded-[14px] border-line text-[13px]'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'
const NATIVE_FIELD = 'w-full h-12 px-3 rounded-[14px] border border-line bg-surface text-[13px] text-ink outline-none focus:border-ink/30 disabled:opacity-50'

const NO_ACCOUNTS: Account[] = []
const NO_CATEGORIES: Category[] = []

function Segmented<T extends string>({ value, options, onChange, disabled }: {
    value: T
    options: { value: T; label: string }[]
    onChange: (value: T) => void
    disabled?: boolean
}) {
    return (
        <div className="relative flex rounded-[14px] bg-surface-hover p-1 gap-1">
            <div
                className={cn(
                    'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[10px] bg-raised shadow-sm transition-transform duration-200 ease-out',
                    value === options[1].value ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                )}
            />
            {options.map(o => (
                <button
                    key={o.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(o.value)}
                    className={cn(
                        'relative z-10 flex-1 py-2 text-[13px] rounded-[10px] transition-colors duration-150',
                        value === o.value ? 'text-ink font-semibold' : 'text-muted-ink font-medium'
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

/** A sensible category for a new bill: a subscriptions one for a subscription, else a bills one. */
function defaultCategory(categories: Category[], kind: BillKind): string {
    const named = kind === 'subscription' ? categories.find(c => /subscri|langganan/i.test(c.name)) : undefined
    return (named ?? categories.find(c => resolveCategoryKind(c) === 'fixed') ?? categories[0])?.id ?? ''
}

interface BillFormProps {
    /** Edit this bill instead of adding one. */
    initial?: RecurringBill
    /** A new bill's starting name and kind, from a suggestion. */
    preset?: { name: string; kind: BillKind }
    onSuccess: () => void
}

export function BillForm({ initial, preset, onSuccess }: BillFormProps) {
    const today = toISODate()
    const [kind, setKind] = useState<BillKind>((initial?.kind as BillKind) ?? preset?.kind ?? 'bill')
    const [name, setName] = useState(initial?.name ?? preset?.name ?? '')
    const [amount, setAmount] = useState(initial ? String(Math.round(initial.amount)) : '')
    const [frequency, setFrequency] = useState<BillFrequency>((initial?.frequency as BillFrequency) ?? 'monthly')
    const [dueDay, setDueDay] = useState(String(initial?.due_day ?? Number(today.slice(8, 10))))
    const [dueMonth, setDueMonth] = useState(initial?.due_month ?? Number(today.slice(5, 7)))
    const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
    const [accountId, setAccountId] = useState(initial?.account_id ?? '')
    const [endsOn, setEndsOn] = useState(initial?.ends_on ?? '')
    const [pickerOpen, setPickerOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const { data: accountsData } = useAccounts()
    const accounts = accountsData ?? NO_ACCOUNTS
    const { data: categoriesData } = useCategories('expense')
    const categories = categoriesData ?? NO_CATEGORIES

    useSeedOnce(accountsData, data => { if (!initial) setAccountId(data[0]?.id ?? '') })
    useSeedOnce(categoriesData, data => { if (!initial) setCategoryId(defaultCategory(data, kind)) })

    const account = accounts.find(a => a.id === accountId)

    const changeKind = (next: BillKind) => {
        setKind(next)
        // Follow the kind unless the user picked a category of their own.
        if (!initial && categoryId === defaultCategory(categories, kind)) setCategoryId(defaultCategory(categories, next))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const parsed = parseCurrencyInput(amount)
        const day = Number(dueDay)
        if (!name.trim()) { toast.error('Give the bill a name.'); return }
        if (parsed <= 0) { toast.error('Enter a valid amount.'); return }
        if (!Number.isInteger(day) || day < 1 || day > 31) { toast.error('The due day is 1 to 31.'); return }
        const startsOn = initial?.starts_on ?? today
        if (endsOn && endsOn < startsOn) { toast.error('The last payment can’t be before the bill starts.'); return }

        const input: BillInput = {
            name: name.trim(),
            amount: parsed,
            kind,
            frequency,
            due_day: day,
            due_month: frequency === 'yearly' ? dueMonth : null,
            category_id: categoryId || null,
            account_id: accountId || null,
            ends_on: endsOn || null,
            starts_on: startsOn,
        }

        setLoading(true)
        const { error } = initial
            ? await recurringBillsService.update(initial.id, input)
            : await recurringBillsService.create(input)
        setLoading(false)
        if (error) { toast.error(error); return }
        toast.success(initial ? 'Bill updated.' : `${input.name} added.`)
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <Segmented
                value={kind}
                options={[{ value: 'bill', label: 'Bill' }, { value: 'subscription', label: 'Subscription' }]}
                onChange={changeKind}
                disabled={loading}
            />

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Name</Label>
                <Input
                    placeholder={kind === 'subscription' ? 'e.g. Netflix' : 'e.g. Rent, Electricity'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    disabled={loading}
                    className={FIELD}
                />
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Usual amount</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-ink font-medium">Rp</span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        className={cn(FIELD, 'pl-10 font-mono')}
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Repeats</Label>
                <Segmented
                    value={frequency}
                    options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]}
                    onChange={setFrequency}
                    disabled={loading}
                />
                <div className="flex gap-2">
                    <div className="w-28 shrink-0">
                        <Input
                            type="text"
                            inputMode="numeric"
                            aria-label="Due day"
                            value={dueDay}
                            onChange={(e) => setDueDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            disabled={loading}
                            className={cn(FIELD, 'text-center')}
                        />
                    </div>
                    {frequency === 'yearly' ? (
                        <select
                            aria-label="Due month"
                            value={dueMonth}
                            onChange={(e) => setDueMonth(Number(e.target.value))}
                            disabled={loading}
                            className={NATIVE_FIELD}
                        >
                            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                    ) : (
                        <p className="flex items-center text-[12px] text-muted-ink leading-snug">
                            Day of the month it’s due. 29–31 fall on the last day of shorter months.
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Category</Label>
                <CategoryTileRail categories={categories} selectedId={categoryId || null} onSelect={setCategoryId} disabled={loading} />
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Usually paid from</Label>
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
                <Label className={FIELD_LABEL}>
                    Last payment <span className="normal-case tracking-normal font-normal">(optional, for installments)</span>
                </Label>
                <input
                    type="date"
                    value={endsOn}
                    min={initial?.starts_on ?? today}
                    onChange={(e) => setEndsOn(e.target.value)}
                    disabled={loading}
                    className={NATIVE_FIELD}
                />
            </div>

            <button type="submit" disabled={loading} className={SUBMIT_BUTTON}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : initial ? 'Save changes' : 'Add bill'}
            </button>
        </form>
    )
}
