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
import { COLORS } from '@/lib/static-colors'
import { ICON_MAP } from '@/lib/icon-map'
import { CategoryIcon } from './category-icon'
import { categoryTypeConfig, CategoryTypePicker } from './category-type-picker'

interface CategoryFormProps {
    onSuccess: () => void
    initial?: Category
    /** Existing standing spending target for this category, if any (expense categories only). */
    initialBudget?: number | null
}

const ICON_KEYS = Object.keys(ICON_MAP)
const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'

export function CategoryForm({ onSuccess, initial, initialBudget }: CategoryFormProps) {
    const [type, setType] = useState<CategoryType>((initial?.type as CategoryType) ?? 'expense')
    const [name, setName] = useState(initial?.name ?? '')
    const [color, setColor] = useState<string>(initial?.color ?? COLORS[0])
    const [icon, setIcon] = useState<string>(initial?.icon ?? ICON_KEYS[0])
    const [budget, setBudget] = useState(initialBudget ? String(initialBudget) : '')
    const [loading, setLoading] = useState(false)

    const isEdit = !!initial

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error('Category name is required.')
            return
        }

        setLoading(true)

        const payload = { name: name.trim(), type, color, icon }

        const { data: category, error } = isEdit
            ? await categoriesService.update(initial.id, payload)
            : await categoriesService.create(payload)

        if (error || !category) {
            setLoading(false)
            toast.error(error ?? 'Something went wrong.')
            return
        }

        if (type === 'expense') {
            const budgetAmount = parseCurrencyInput(budget)
            if (budgetAmount > 0) {
                await categoryBudgetsService.upsert(category.id, budgetAmount)
            } else if (isEdit && initialBudget) {
                await categoryBudgetsService.remove(category.id)
            }
        }

        setLoading(false)
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
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                />
            </div>

            {/* Spending target (expense categories only) */}
            {type === 'expense' && (
                <div className="space-y-1.5">
                    <Label className={FIELD_LABEL}>Spending target per period (optional)</Label>
                    <div className="flex items-center gap-2 h-12 rounded-[14px] border border-[#e5e5e5] px-4">
                        <span className="text-[13px] text-[#8a8a84] font-medium">Rp</span>
                        <input
                            inputMode="numeric"
                            value={formatCurrencyInput(budget)}
                            onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
                            placeholder="0"
                            disabled={loading}
                            className="flex-1 text-[13px] font-medium text-[#252525] outline-none bg-transparent"
                        />
                    </div>
                    <p className="text-[10.5px] text-[#a3a3a3]">Shown as budget progress in Analytics.</p>
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
                                className={cn(
                                    'aspect-square rounded-[10px] flex items-center justify-center transition-all duration-150',
                                    selected ? 'scale-105' : 'hover:bg-[#f4f4f2]'
                                )}
                                style={selected ? { backgroundColor: color + '25' } : undefined}
                            >
                                <CategoryIcon
                                    name={key}
                                    className="w-[18px] h-[18px]"
                                    style={{ color: selected ? color : undefined }}
                                />
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
                <Label className={FIELD_LABEL}>Color</Label>
                <div className="grid grid-cols-10 gap-2">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={cn(
                                'aspect-square rounded-full transition-all duration-150',
                                color === c
                                    ? 'ring-2 ring-offset-2 ring-offset-white ring-[#252525] scale-110'
                                    : 'hover:scale-105'
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-[#f4f4f2]">
                <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: color + '25' }}
                >
                    <CategoryIcon
                        name={icon}
                        className="w-[18px] h-[18px]"
                        style={{ color }}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#252525] truncate leading-tight">
                        {name.trim() || <span className="text-[#8a8a84] italic font-normal">Category name</span>}
                    </p>
                    <p className="text-[11px] text-[#8a8a84] capitalize mt-0.5">{type}</p>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                {loading
                    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    : isEdit ? 'Save Changes' : 'Create Category'
                }
            </button>
        </form>
    )
}
