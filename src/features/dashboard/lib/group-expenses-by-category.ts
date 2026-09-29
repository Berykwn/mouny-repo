import type { TransactionWithDetails } from '@/types'

export interface CategoryTotal {
    id: string
    name: string
    color: string | null
    bg_color?: string | null
    icon?: string | null
    amount: number
}

/** Expense transactions grouped and summed by category, sorted by amount desc. */
export function groupExpensesByCategory(transactions: TransactionWithDetails[]): CategoryTotal[] {
    const map = new Map<string, CategoryTotal>()
    for (const tx of transactions) {
        if (tx.type !== 'expense' || !tx.category) continue
        const existing = map.get(tx.category.id)
        if (existing) {
            existing.amount += tx.amount
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
