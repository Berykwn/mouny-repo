import { ChevronRight } from 'lucide-react'
import type { Category } from '@/types'
import { CategoryTile } from './category-icon'
import { cn } from '@/lib/utils'
import { formatShortCurrency } from '@/lib/helpers'
import { CATEGORY_KINDS, CATEGORY_KIND_META, resolveCategoryKind } from '@/lib/category-kind'

interface CategoryListProps {
    categories: Category[]
    /** Which side to show: expenses grouped by kind, or income. */
    type: 'expense' | 'income'
    budgets: Record<string, number>
    /** What each category has moved in the active period, by category id. */
    periodTotals: Map<string, number>
    /** 0–1 of the active period gone by: where the budget bars' pace marker sits. Null hides it. */
    pace: number | null
    /** Tapping a row opens its edit sheet. */
    onOpen: (category: Category) => void
}

const newestFirst = (a: Category, b: Category) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()

export function CategoryList({ categories, type, budgets, periodTotals, pace, onOpen }: CategoryListProps) {
    const items = categories.filter(c => c.type === type).sort(newestFirst)

    const row = (cat: Category) => {
        const spent = periodTotals.get(cat.id) ?? 0
        const budget = cat.type === 'expense' ? budgets[cat.id] : undefined
        const over = budget !== undefined && spent > budget
        const sub = budget !== undefined
            ? `${formatShortCurrency(spent)} of ${formatShortCurrency(budget)}${over ? ' · over' : ''}`
            : spent > 0 ? `${formatShortCurrency(spent)} this period` : cat.type === 'income' ? 'Nothing yet this period' : 'No budget'
        return (
            <li key={cat.id} className="border-b border-line-soft last:border-0">
                <button
                    type="button"
                    onClick={() => onOpen(cat)}
                    className="w-full flex items-center gap-3 py-3 text-left transition-colors hover:bg-surface-soft"
                >
                    <CategoryTile category={cat} className="w-11 h-11 rounded-[12px] [&_svg]:w-[22px] [&_svg]:h-[22px]" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[15.5px] font-medium text-ink truncate">{cat.name}</p>
                        <p className={cn('text-[13px] truncate tabular-nums', over ? 'text-negative' : 'text-subtle-ink')}>{sub}</p>
                        {budget !== undefined && budget > 0 && (
                            <div aria-hidden="true" className="relative mt-2 h-[3px] rounded-full bg-line-soft">
                                <div
                                    className={cn('absolute inset-y-0 left-0 rounded-full', over ? 'bg-negative' : 'bg-ink')}
                                    style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }}
                                />
                                {pace !== null && (
                                    <span
                                        aria-hidden
                                        title="Where today sits in the period"
                                        className="absolute -top-[3px] w-[2px] h-[9px] rounded-[1px] bg-brand"
                                        style={{ left: `${Math.round(pace * 100)}%` }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-faint-ink shrink-0" />
                </button>
            </li>
        )
    }

    if (type === 'income') return <ul>{items.map(row)}</ul>

    return (
        <div className="space-y-2">
            {/* Expenses by what they're for — the grouping analytics splits spending by */}
            {CATEGORY_KINDS.map(kind => {
                const group = items.filter(c => resolveCategoryKind(c) === kind)
                if (group.length === 0) return null
                return (
                    <section key={kind}>
                        <div className="flex items-baseline justify-between pt-4 pb-1">
                            <h2 className="text-[13px] font-semibold uppercase tracking-[.06em] text-subtle-ink">{CATEGORY_KIND_META[kind].label}</h2>
                            <span className="text-[13px] text-subtle-ink tabular-nums">{group.length}</span>
                        </div>
                        <ul>{group.map(row)}</ul>
                    </section>
                )
            })}
        </div>
    )
}
