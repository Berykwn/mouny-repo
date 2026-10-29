import type { Category } from '@/types'
import { CategoryTile } from './category-icon'
import { formatShortCurrency } from '@/lib/helpers'
import { CATEGORY_KINDS, CATEGORY_KIND_META, resolveCategoryKind } from '@/lib/category-kind'
import { PlanRow, PlanSection, RowAmount } from '@/features/plan/components/layout'

interface CategoryListProps {
    categories: Category[]
    /** Which side to show: expenses grouped by kind, or income. */
    type: 'expense' | 'income'
    budgets: Record<string, number>
    /** What each category has moved in the active period, by category id. */
    periodTotals: Map<string, number>
    /** 0–1 of the active period gone by, to say when a budget is going faster than the period. Null leaves it out. */
    pace: number | null
    /** Tapping a row opens its edit sheet. */
    onOpen: (category: Category) => void
}

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))

/** A budget this far past the period's pace reads as "ahead of pace"; closer is noise. */
const AHEAD_MARGIN = 0.1

const newestFirst = (a: Category, b: Category) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()

/** The line under a category's name: what's left of its budget, or that it has none. */
function budgetLine(spent: number, budget: number | undefined, pace: number | null, income: boolean): { text: string; over: boolean } {
    if (income) return { text: spent > 0 ? 'Came in this period' : 'Nothing yet this period', over: false }
    if (budget === undefined || budget <= 0) return { text: 'No budget', over: false }
    if (spent > budget) return { text: `Over by ${formatShortCurrency(spent - budget)}`, over: true }
    const ahead = pace !== null && spent / budget > pace + AHEAD_MARGIN
    return { text: `${formatShortCurrency(budget - spent)} left${ahead ? ' · ahead of pace' : ''}`, over: false }
}

export function CategoryList({ categories, type, budgets, periodTotals, pace, onOpen }: CategoryListProps) {
    const items = categories.filter(c => c.type === type).sort(newestFirst)

    const row = (cat: Category) => {
        const spent = periodTotals.get(cat.id) ?? 0
        const budget = cat.type === 'expense' ? budgets[cat.id] : undefined
        const line = budgetLine(spent, budget, pace, cat.type === 'income')
        return (
            <PlanRow
                key={cat.id}
                lead={<CategoryTile category={cat} className="w-10 h-10 rounded-[12px] [&_svg]:w-[22px] [&_svg]:h-[22px]" />}
                title={cat.name}
                sub={line.text}
                subClassName={line.over ? 'text-negative' : undefined}
                onOpen={() => onOpen(cat)}
                end={(
                    <RowAmount muted={spent === 0} sub={budget ? `of ${formatShortCurrency(budget)}` : undefined}>
                        {plain(spent)}
                    </RowAmount>
                )}
            />
        )
    }

    if (type === 'income') return <PlanSection title="Income" meta={items.length}>{items.map(row)}</PlanSection>

    return (
        <div className="space-y-6">
            {/* Expenses by what they're for — the grouping analytics splits spending by */}
            {CATEGORY_KINDS.map(kind => {
                const group = items.filter(c => resolveCategoryKind(c) === kind)
                if (group.length === 0) return null
                return (
                    <PlanSection key={kind} title={CATEGORY_KIND_META[kind].label} meta={group.length}>
                        {group.map(row)}
                    </PlanSection>
                )
            })}
        </div>
    )
}
