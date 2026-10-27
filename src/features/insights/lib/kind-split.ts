import { resolveCategoryKind, type CategoryKind } from '@/lib/category-kind'
import type { TransactionWithDetails } from '@/types'

/** The 50/30/20 guide: needs at most half of income, wants at most 30%, savings at least 20%. */
export const GUIDE = { needs: 50, wants: 30, savings: 20 }

export const SEGMENTS: CategoryKind[] = ['fixed', 'daily', 'lifestyle', 'savings']

export interface KindSplit {
    byKind: Record<CategoryKind, number>
    totalExpense: number
    hasIncome: boolean
    /** Share of income (or of what went out, with no income), in whole percent. */
    pctOf: (amount: number) => number
    unspent: number
    needs: number
}

/** Expenses by what the money was for; uncategorized counts as everyday. */
export function kindSplit(expenses: TransactionWithDetails[], totalIncome: number): KindSplit {
    const byKind: Record<CategoryKind, number> = { fixed: 0, daily: 0, lifestyle: 0, savings: 0 }
    for (const tx of expenses) byKind[resolveCategoryKind(tx.category)] += tx.amount
    const totalExpense = SEGMENTS.reduce((s, k) => s + byKind[k], 0)
    // Shares of income when there is one; otherwise of what went out, with no guide to hold it to.
    const hasIncome = totalIncome > 0
    const pctOf = (amount: number) => {
        const base = hasIncome ? totalIncome : totalExpense
        return base > 0 ? Math.round((amount / base) * 100) : 0
    }
    return {
        byKind,
        totalExpense,
        hasIncome,
        pctOf,
        unspent: hasIncome ? Math.max(0, totalIncome - totalExpense) : 0,
        needs: byKind.fixed + byKind.daily,
    }
}
