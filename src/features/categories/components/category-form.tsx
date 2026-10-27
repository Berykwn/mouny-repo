import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { categoriesService } from '@/services/accounts-categories.service'
import { categoryBudgetsService } from '@/services/budgets.service'
import { usePeriods, useTransactionsOfPeriods } from '@/queries'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { OFFLINE_REASON } from '@/components/offline-banner'
import { SmartLine } from '@/components/smart-line'
import { cn } from '@/lib/utils'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/helpers'
import { toast } from 'sonner'
import type { Category, CategoryType } from '@/types'
import { COLORS, SWATCHES } from '@/lib/static-colors'
import { ICON_MAP } from '@/lib/icon-map'
import { CATEGORY_KINDS, CATEGORY_KIND_META, guessCategoryKind, resolveCategoryKind, type CategoryKind } from '@/lib/category-kind'
import { QuickAmountsEditor } from '@/features/quick-transactions/components/quick-amounts-editor'
import { CategoryIcon, CategoryTile } from './category-icon'
import { categoryTypeConfig } from '../lib/category-types'
import { BUDGET_HISTORY_PERIODS, budgetSuggestion, categoryTotals } from '../lib/budget-history'

interface CategoryFormProps {
    onSuccess: () => void
    initial?: Category
    /** Existing standing spending target for this category, if any (expense categories only). */
    initialBudget?: number | null
    /** Shown as Delete next to Save when editing. */
    onDelete?: () => void
}

const ICON_KEYS = Object.keys(ICON_MAP)
const FIELD_LABEL = 'text-[13px] font-semibold text-muted-ink'
const NO_IDS: string[] = []

const amount = (n: number) => n.toLocaleString('id-ID')

/** A row of equal options on a soft track, the selected one raised. */
function Segment<T extends string>({ options, value, onChange, disabled, label }: {
    options: { value: T; label: string }[]
    /** Null while nothing is picked yet: no option is raised. */
    value: T | null
    onChange: (value: T) => void
    disabled?: boolean
    label: string
}) {
    return (
        <div role="radiogroup" aria-label={label} className="flex rounded-[12px] bg-line-soft p-[3px]">
            {options.map(o => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    disabled={disabled}
                    onClick={() => onChange(o.value)}
                    className={cn(
                        'flex-1 min-w-0 h-10 px-1 rounded-[9px] text-[14px] font-semibold truncate transition-colors disabled:opacity-50',
                        value === o.value ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.1)]' : 'text-muted-ink hover:text-ink'
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

export function CategoryForm({ onSuccess, initial, initialBudget, onDelete }: CategoryFormProps) {
    const [type, setType] = useState<CategoryType>((initial?.type as CategoryType) ?? 'expense')
    const [name, setName] = useState(initial?.name ?? '')
    const [color, setColor] = useState<string>(initial?.color ?? COLORS[0])
    const [bgColor, setBgColor] = useState<string | null>(initial?.bg_color ?? null)
    const [colorTarget, setColorTarget] = useState<'icon' | 'bg'>('icon')
    const [icon, setIcon] = useState<string>(initial?.icon ?? ICON_KEYS[0])
    // A new category picks its look first; an existing one keeps the picker tucked away.
    const [lookOpen, setLookOpen] = useState(!initial)
    const [budget, setBudget] = useState(initialBudget ? String(Math.round(initialBudget)) : '')
    // A new category's kind is the user's pick; the name only offers a suggestion to tap.
    const [kind, setKind] = useState<CategoryKind | null>(initial ? resolveCategoryKind(initial) : null)
    const [kindMissing, setKindMissing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [suggestionDismissed, setSuggestionDismissed] = useState(false)
    const online = useOnlineStatus()

    const isEdit = !!initial
    const isExpense = type === 'expense'
    // Only a name that clearly reads as bills or lifestyle earns a suggestion; everyday is no hint.
    const guessed = !kind && name.trim() ? guessCategoryKind(name) : null
    const suggestedKind = guessed && guessed !== 'daily' ? guessed : null

    // How this budget held up over the last closed periods, from transactions already cached for Insights.
    const { periods, activePeriod } = usePeriods()
    const historyIds = useMemo(() => !isEdit || !initialBudget ? NO_IDS : periods
        .filter(p => p.status === 'closed' && (!activePeriod || p.start_date < activePeriod.start_date))
        .sort((a, b) => b.start_date.localeCompare(a.start_date))
        .slice(0, BUDGET_HISTORY_PERIODS)
        .map(p => p.id), [isEdit, initialBudget, periods, activePeriod])
    const history = useTransactionsOfPeriods(historyIds)
    const suggestion = initial && history && isExpense ? budgetSuggestion(categoryTotals(initial.id, history), initialBudget) : null
    const showSuggestion = !!suggestion && !suggestionDismissed && parseCurrencyInput(budget) === initialBudget

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!online) {
            toast(OFFLINE_REASON)
            return
        }
        if (!name.trim()) {
            toast.error('Category name is required.')
            return
        }
        if (isExpense && !kind) {
            setKindMissing(true)
            return
        }

        setLoading(true)

        const payload = { name: name.trim(), type, color, bg_color: bgColor, icon, kind: isExpense ? kind : null, is_savings: isExpense && kind === 'savings' }

        const { data: category, error } = isEdit
            ? await categoriesService.update(initial.id, payload)
            : await categoriesService.create(payload)

        if (error || !category) {
            setLoading(false)
            toast.error(error ?? 'Something went wrong.')
            return
        }

        let budgetError: string | null = null
        if (isExpense) {
            const budgetAmount = parseCurrencyInput(budget)
            if (budgetAmount > 0) {
                ({ error: budgetError } = await categoryBudgetsService.upsert(category.id, budgetAmount))
            } else if (isEdit && initialBudget) {
                ({ error: budgetError } = await categoryBudgetsService.remove(category.id))
            }
        } else if (isEdit && initialBudget) {
            // Budgets only apply to expenses; don't leave one behind on a category now marked income.
            ({ error: budgetError } = await categoryBudgetsService.remove(category.id))
        }

        setLoading(false)
        if (budgetError) {
            toast.error(`Category saved, but the budget wasn't: ${budgetError}`)
            onSuccess()
            return
        }
        toast.success(isEdit ? 'Category saved.' : 'Category added.')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 pb-2">
            {!isEdit && (
                <Segment
                    label="Type"
                    value={type}
                    onChange={setType}
                    options={(['expense', 'income'] as CategoryType[]).map(t => ({ value: t, label: categoryTypeConfig[t].label }))}
                />
            )}

            {/* Icon and name */}
            <div className="flex items-end gap-3">
                <button
                    type="button"
                    onClick={() => setLookOpen(o => !o)}
                    aria-expanded={lookOpen}
                    aria-label="Change icon and colour"
                    className="shrink-0 rounded-[16px] focus-visible:outline-2 focus-visible:outline-brand"
                >
                    <CategoryTile category={{ color, bg_color: bgColor, icon }} className="w-[52px] h-[52px] rounded-[16px] [&_svg]:w-6 [&_svg]:h-6" />
                </button>
                <div className="flex-1 min-w-0 space-y-1.5">
                    <Label htmlFor="category-name" className={FIELD_LABEL}>Name</Label>
                    <Input
                        id="category-name"
                        placeholder={categoryTypeConfig[type].sub}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        className="h-[52px] rounded-[14px] border-line px-4 text-[16px] md:text-[15px]"
                    />
                </div>
            </div>

            {lookOpen && (
                <div className="space-y-3 rounded-[16px] border border-line p-3">
                    <div className="grid grid-cols-8 gap-1">
                        {ICON_KEYS.map((key) => {
                            const selected = icon === key
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    title={key}
                                    aria-pressed={selected}
                                    onClick={() => setIcon(key)}
                                    className="group aspect-square flex items-center justify-center"
                                >
                                    {selected ? (
                                        <CategoryTile category={{ color, bg_color: bgColor, icon: key }} />
                                    ) : (
                                        <span className="w-8 h-8 rounded-[10px] flex items-center justify-center text-muted-ink transition-colors group-hover:bg-surface-hover">
                                            <CategoryIcon name={key} className="w-[18px] h-[18px]" />
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex p-0.5 rounded-[10px] bg-line-soft">
                            {(['icon', 'bg'] as const).map((target) => (
                                <button
                                    key={target}
                                    type="button"
                                    onClick={() => setColorTarget(target)}
                                    className={cn(
                                        'px-3 h-7 rounded-[8px] text-[12px] font-semibold transition-colors',
                                        colorTarget === target ? 'bg-surface text-ink shadow-sm' : 'text-muted-ink'
                                    )}
                                >
                                    {target === 'icon' ? 'Icon colour' : 'Background'}
                                </button>
                            ))}
                        </div>
                        {colorTarget === 'bg' && (
                            <button
                                type="button"
                                title="Soft tint of the icon colour"
                                onClick={() => setBgColor(null)}
                                className={cn(
                                    'px-3 h-7 rounded-[8px] text-[12px] font-medium border transition-colors',
                                    bgColor === null ? 'border-ink text-ink' : 'border-dashed border-line-strong text-muted-ink'
                                )}
                                style={{ backgroundColor: color + '20' }}
                            >
                                Auto
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-10 gap-2">
                        {SWATCHES.map((c) => {
                            const selected = colorTarget === 'icon' ? color === c : bgColor === c
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    aria-label={c}
                                    aria-pressed={selected}
                                    onClick={() => colorTarget === 'icon' ? setColor(c) : setBgColor(c)}
                                    className={cn(
                                        'aspect-square rounded-full border border-black/5 transition-all duration-150',
                                        selected
                                            ? 'ring-2 ring-offset-2 ring-offset-surface ring-ink scale-110'
                                            : 'hover:scale-105'
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            )
                        })}
                    </div>
                </div>
            )}

            {/* What the category is for (expense categories only) — drives pace and the needs/wants split */}
            {isExpense && (
                <div className="space-y-1.5">
                    <Label className={FIELD_LABEL}>Kind</Label>
                    <Segment
                        label="Kind"
                        value={kind}
                        disabled={loading}
                        onChange={(k) => { setKind(k); setKindMissing(false) }}
                        options={CATEGORY_KINDS.map(k => ({ value: k, label: CATEGORY_KIND_META[k].label }))}
                    />
                    {kind ? (
                        <p className="text-[12px] text-subtle-ink">{CATEGORY_KIND_META[kind].sub}</p>
                    ) : (
                        <p className={cn('text-[12px]', kindMissing ? 'text-negative-ink' : 'text-subtle-ink')}>
                            {kindMissing ? 'Pick a kind to add this category.' : 'Pick what this category is for.'}
                            {suggestedKind && (
                                <>
                                    {' '}
                                    <button
                                        type="button"
                                        onClick={() => { setKind(suggestedKind); setKindMissing(false) }}
                                        className="font-semibold text-brand-ink hover:text-brand transition-colors"
                                    >
                                        Suggested: {CATEGORY_KIND_META[suggestedKind].label}
                                    </button>
                                </>
                            )}
                        </p>
                    )}
                </div>
            )}

            {/* Spending target (expense categories only) */}
            {isExpense && (
                <div className="space-y-1.5">
                    <Label htmlFor="category-budget" className={FIELD_LABEL}>Budget per period</Label>
                    <div className="flex items-center gap-2.5 h-[52px] rounded-[14px] border border-line px-4 focus-within:border-line-strong">
                        <span className="text-[15px] text-subtle-ink">Rp</span>
                        <input
                            id="category-budget"
                            inputMode="numeric"
                            value={formatCurrencyInput(budget)}
                            onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
                            placeholder="No budget"
                            disabled={loading}
                            className="flex-1 min-w-0 text-[16px] md:text-[15px] text-ink outline-none bg-transparent placeholder:text-subtle-ink tabular-nums"
                        />
                    </div>
                </div>
            )}

            {showSuggestion && suggestion && (
                <SmartLine
                    actions={[
                        { label: `Set to ${amount(suggestion.suggested)}`, onClick: () => setBudget(String(suggestion.suggested)) },
                        { label: `Keep ${amount(initialBudget!)}`, onClick: () => setSuggestionDismissed(true) },
                    ]}
                >
                    Over budget in <b>{suggestion.overCount} of the last {suggestion.periodCount}</b> periods. Your median is {formatCurrency(Math.round(suggestion.median))}.
                </SmartLine>
            )}

            {initial && <QuickAmountsEditor category={initial} />}

            <div className={cn('grid gap-2 pt-1', isEdit && onDelete ? 'grid-cols-2' : 'grid-cols-1')}>
                {isEdit && onDelete && (
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={loading}
                        className="h-12 rounded-[14px] bg-line-soft text-[15px] font-semibold text-ink hover:bg-surface-hover transition-colors disabled:opacity-50"
                    >
                        Delete
                    </button>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    title={online ? undefined : OFFLINE_REASON}
                    className={cn(
                        'h-12 rounded-[14px] text-[15px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors disabled:opacity-50 disabled:pointer-events-none',
                        !online && 'opacity-50',
                    )}
                >
                    {loading
                        ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        : isEdit ? 'Save' : 'Add category'
                    }
                </button>
            </div>
        </form>
    )
}
