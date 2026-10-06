import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { categoriesService } from '@/services/accounts-categories.service'
import { categoryBudgetsService } from '@/services/budgets.service'
import { cn } from '@/lib/utils'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/helpers'
import { toast } from 'sonner'
import type { Category, CategoryType } from '@/types'
import { COLORS, SWATCHES } from '@/lib/static-colors'
import { ICON_MAP } from '@/lib/icon-map'
import { CategoryIcon, CategoryTile } from './category-icon'
import { CategoryTypePicker } from './category-type-picker'
import { categoryTypeConfig } from '../lib/category-types'
import { CategoryKindPicker } from './category-kind-picker'
import { CATEGORY_KIND_META, guessCategoryKind, resolveCategoryKind, type CategoryKind } from '@/lib/category-kind'

interface CategoryFormProps {
    onSuccess: () => void
    initial?: Category
    /** Existing standing spending target for this category, if any (expense categories only). */
    initialBudget?: number | null
}

const ICON_KEYS = Object.keys(ICON_MAP)
const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'

export function CategoryForm({ onSuccess, initial, initialBudget }: CategoryFormProps) {
    const [type, setType] = useState<CategoryType>((initial?.type as CategoryType) ?? 'expense')
    const [name, setName] = useState(initial?.name ?? '')
    const [color, setColor] = useState<string>(initial?.color ?? COLORS[0])
    const [bgColor, setBgColor] = useState<string | null>(initial?.bg_color ?? null)
    const [colorTarget, setColorTarget] = useState<'icon' | 'bg'>('icon')
    const [icon, setIcon] = useState<string>(initial?.icon ?? ICON_KEYS[0])
    const [budget, setBudget] = useState(initialBudget ? String(Math.round(initialBudget)) : '')
    const [kind, setKind] = useState<CategoryKind>(initial ? resolveCategoryKind(initial) : 'daily')
    // A new category's kind follows its name until it's picked by hand.
    const [kindPicked, setKindPicked] = useState(!!initial)
    const [loading, setLoading] = useState(false)

    const isEdit = !!initial

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error('Category name is required.')
            return
        }

        setLoading(true)

        const isExpense = type === 'expense'
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
        if (type === 'expense') {
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
        toast.success(isEdit ? 'Category updated successfully.' : 'Category created successfully.')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 pb-2">
            <CategoryTypePicker value={type} onChange={setType} />

            {/* Name */}
            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Category name</Label>
                <Input
                    placeholder={categoryTypeConfig[type].sub}
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value)
                        if (!kindPicked) setKind(guessCategoryKind(e.target.value))
                    }}
                    disabled={loading}
                    className="h-12 rounded-[14px] border-line text-[13px]"
                />
            </div>

            {/* Spending target (expense categories only) */}
            {type === 'expense' && (
                <div className="space-y-1.5">
                    <Label className={FIELD_LABEL}>Spending target per period (optional)</Label>
                    <div className="flex items-center gap-2 h-12 rounded-[14px] border border-line px-4">
                        <span className="text-[13px] text-muted-ink font-medium">Rp</span>
                        <input
                            inputMode="numeric"
                            value={formatCurrencyInput(budget)}
                            onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
                            placeholder="0"
                            disabled={loading}
                            className="flex-1 text-[13px] font-medium text-ink outline-none bg-transparent"
                        />
                    </div>
                    <p className="text-[10.5px] text-subtle-ink">Shown as budget progress in Analytics.</p>
                </div>
            )}

            {/* What the category is for (expense categories only) — drives pace and the needs/wants split */}
            {type === 'expense' && (
                <div className="space-y-1.5">
                    <Label className={FIELD_LABEL}>Kind</Label>
                    <CategoryKindPicker
                        value={kind}
                        onChange={(k) => { setKind(k); setKindPicked(true) }}
                        disabled={loading}
                    />
                </div>
            )}

            {/* Icon picker */}
            <div className="space-y-2">
                <Label className={FIELD_LABEL}>Icon</Label>
                <div className="grid grid-cols-8 gap-1">
                    {ICON_KEYS.map((key) => {
                        const selected = icon === key
                        return (
                            <button
                                key={key}
                                type="button"
                                title={key}
                                onClick={() => setIcon(key)}
                                className="group aspect-square flex items-center justify-center"
                            >
                                {selected ? (
                                    <CategoryTile category={{ color, bg_color: bgColor, icon: key }} />
                                ) : (
                                    <span className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors group-hover:bg-surface-hover">
                                        <CategoryIcon name={key} className="w-[18px] h-[18px]" />
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Color picker: icon color and tile background are chosen separately */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className={FIELD_LABEL}>Color</Label>
                    <div className="flex items-center gap-2">
                        {colorTarget === 'bg' && (
                            <button
                                type="button"
                                title="Soft tint of the icon color"
                                onClick={() => setBgColor(null)}
                                className={cn(
                                    'px-3 h-7 rounded-[8px] text-[11px] font-medium border transition-colors',
                                    bgColor === null
                                        ? 'border-ink text-ink'
                                        : 'border-dashed border-line-strong text-muted-ink'
                                )}
                                style={{ backgroundColor: color + '20' }}
                            >
                                Auto
                            </button>
                        )}
                        <div className="flex p-0.5 rounded-[10px] bg-surface-hover">
                            {(['icon', 'bg'] as const).map((target) => (
                                <button
                                    key={target}
                                    type="button"
                                    onClick={() => setColorTarget(target)}
                                    className={cn(
                                        'px-3 h-7 rounded-[8px] text-[11px] font-medium transition-colors',
                                        colorTarget === target ? 'bg-raised text-ink shadow-sm' : 'text-muted-ink'
                                    )}
                                >
                                    {target === 'icon' ? 'Icon' : 'Background'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-10 gap-2">
                    {SWATCHES.map((c) => {
                        const selected = colorTarget === 'icon' ? color === c : bgColor === c
                        return (
                            <button
                                key={c}
                                type="button"
                                onClick={() => colorTarget === 'icon' ? setColor(c) : setBgColor(c)}
                                className={cn(
                                    'aspect-square rounded-full border border-black/5 transition-all duration-150',
                                    selected
                                        ? 'ring-2 ring-offset-2 ring-offset-white ring-ink scale-110'
                                        : 'hover:scale-105'
                                )}
                                style={{ backgroundColor: c }}
                            />
                        )
                    })}
                </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-surface-hover">
                <CategoryTile category={{ color, bg_color: bgColor, icon }} className="border border-black/5" />
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink truncate leading-tight">
                        {name.trim() || <span className="text-muted-ink italic font-normal">Category name</span>}
                    </p>
                    <p className="text-[11px] text-muted-ink mt-0.5">
                        {type === 'expense' ? `Expense · ${CATEGORY_KIND_META[kind].label}` : 'Income'}
                    </p>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                {loading
                    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    : isEdit ? 'Save Changes' : 'Create Category'
                }
            </button>
        </form>
    )
}
