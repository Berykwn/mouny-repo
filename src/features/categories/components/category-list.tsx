import type { Category } from '@/types'
import { CategoryTile } from './category-icon'
import { cn } from '@/lib/utils'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { CATEGORY_KINDS, CATEGORY_KIND_META, resolveCategoryKind } from '@/lib/category-kind'

interface CategoryListProps {
    categories: Category[]
    budgets: Record<string, number>
    /** What each category has moved in the active period, by category id. */
    periodTotals: Map<string, number>
    /** Tapping a row opens its detail sheet, where edit / delete live. */
    onOpen: (category: Category) => void
}

export function CategoryList({ categories, budgets, periodTotals, onOpen }: CategoryListProps) {
    const expense = categories
        .filter(c => c.type === 'expense')
        .sort(
            (a, b) =>
                new Date(b.created_at ?? 0).getTime() -
                new Date(a.created_at ?? 0).getTime()
        )

    const income = categories
        .filter(c => c.type === 'income')
        .sort(
            (a, b) =>
                new Date(b.created_at ?? 0).getTime() -
                new Date(a.created_at ?? 0).getTime()
        )

    const Section = ({ label, sub, items }: { label: string; sub?: string; items: Category[] }) => {
        if (items.length === 0) return null
        return (
            <div className="space-y-1.5">
                <div className="px-1">
                    <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">
                        {label} <span className="text-subtle-ink">· {items.length}</span>
                    </p>
                    {sub && <p className="text-[11px] text-subtle-ink">{sub}</p>}
                </div>
                <div className="card overflow-hidden divide-y divide-line-soft">
                    {items.map((cat) => {
                        const spent = periodTotals.get(cat.id) ?? 0
                        const budget = cat.type === 'expense' ? budgets[cat.id] : undefined
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => onOpen(cat)}
                                className="w-full flex items-center gap-3 px-4 py-[9px] text-left transition-colors hover:bg-surface-soft active:bg-surface-hover"
                            >
                                <CategoryTile category={cat} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-ink truncate">{cat.name}</p>
                                    {budget !== undefined && (
                                        <p className="text-[11px] text-muted-ink truncate">
                                            {formatCurrency(budget)}/period
                                        </p>
                                    )}
                                </div>
                                {spent > 0 && (
                                    <div className="text-right shrink-0">
                                        <p className={cn(
                                            'text-[13px] font-medium tabular-nums',
                                            budget !== undefined && spent > budget ? 'text-negative' : 'text-ink'
                                        )}>
                                            {formatShortCurrency(spent)}
                                        </p>
                                        <p className="text-[10.5px] text-subtle-ink">this period</p>
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Expenses by what they're for — the grouping analytics splits spending by */}
            {CATEGORY_KINDS.map(kind => (
                <Section
                    key={kind}
                    label={CATEGORY_KIND_META[kind].label}
                    sub={CATEGORY_KIND_META[kind].sub}
                    items={expense.filter(c => resolveCategoryKind(c) === kind)}
                />
            ))}
            <Section label="Income" items={income} />
        </div>
    )
}
