import type { TransactionWithDetails } from '@/types'

export interface CategoryTotal {
    id: string
    name: string
    color: string | null
    bg_color?: string | null
    icon?: string | null
    amount: number
}

/** Group id for expenses with no category, so they still add up to the period total. */
export const UNCATEGORIZED_ID = 'uncategorized'

/** Expense transactions grouped and summed by category, sorted by amount desc. */
export function groupExpensesByCategory(transactions: TransactionWithDetails[]): CategoryTotal[] {
    const map = new Map<string, CategoryTotal>()
    for (const tx of transactions) {
        if (tx.type !== 'expense') continue
        const key = tx.category?.id ?? UNCATEGORIZED_ID
        const existing = map.get(key)
        if (existing) {
            existing.amount += tx.amount
        } else if (!tx.category) {
            map.set(key, { id: UNCATEGORIZED_ID, name: 'Uncategorized', color: null, bg_color: null, icon: null, amount: tx.amount })
        } else {
            map.set(tx.category.id, {
                id: tx.category.id,
                name: tx.category.name,
                color: tx.category.color,
                bg_color: tx.category.bg_color,
                icon: tx.category.icon,
                amount: tx.amount,
            })
        }
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
}

export function getTopExpenseCategory(transactions: TransactionWithDetails[]): CategoryTotal | null {
    return groupExpensesByCategory(transactions)[0] ?? null
}
