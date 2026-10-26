import type { TransactionWithDetails } from '@/types'

/** Closed periods a budget is checked against. */
export const BUDGET_HISTORY_PERIODS = 6

/** Fewer periods than this say nothing about a habit. */
const MIN_PERIODS = 3

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** What one category's expenses added up to in each period's transactions. */
export function categoryTotals(categoryId: string, periodsTxs: TransactionWithDetails[][]): number[] {
    return periodsTxs.map(txs => txs
        .filter(t => t.type === 'expense' && t.category_id === categoryId)
        .reduce((s, t) => s + t.amount, 0))
}

/** Up to a round step that suits the size: 375.000, 45.000, 12.000. */
export function roundBudgetUp(amount: number): number {
    const step = amount >= 100_000 ? 25_000 : amount >= 20_000 ? 5_000 : 1_000
    return Math.ceil(amount / step) * step
}

export interface BudgetSuggestion {
    overCount: number
    periodCount: number
    median: number
    /** The median rounded up: a budget this habit actually fits. */
    suggested: number
}

/**
 * A budget the history keeps breaking: over it in at least half of the recent periods, with a
 * median above it. Suggests the median, rounded up; the user decides. Null when the budget
 * holds, or there's too little history to tell.
 */
export function budgetSuggestion(totals: number[], budget: number | null | undefined): BudgetSuggestion | null {
    if (!budget || budget <= 0 || totals.length < MIN_PERIODS) return null
    const overCount = totals.filter(t => t > budget).length
    const mid = median(totals)
    if (overCount < Math.ceil(totals.length / 2) || mid <= budget) return null
    const suggested = roundBudgetUp(mid)
    return suggested === budget ? null : { overCount, periodCount: totals.length, median: mid, suggested }
}
