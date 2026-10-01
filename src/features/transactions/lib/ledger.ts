import type { TransactionWithDetails } from '@/types'

/** Categories the debts feature creates for its own transactions (see debts.service). */
const DEBT_CATEGORY_NAMES = new Set(['Debt Payment', 'Receivable'])
const DEBT_NOTE = /^(Debt payment|Debt received|Lent to) —/

/**
 * The record a transaction belongs to, when another feature made it. Its money then has
 * to stay in step with that record (a wish's saved amount, a debt's remaining amount).
 */
export function linkedTo(tx: TransactionWithDetails): 'wish' | 'debt' | null {
    if (tx.wish_list_item_id) return 'wish'
    if ((tx.category && DEBT_CATEGORY_NAMES.has(tx.category.name)) || (tx.note && DEBT_NOTE.test(tx.note))) return 'debt'
    return null
}

export function txTitle(tx: TransactionWithDetails): string {
    return tx.note || tx.category?.name || (tx.type === 'income' ? 'Income' : 'Expense')
}

export interface DayGroup {
    date: string
    txs: TransactionWithDetails[]
    income: number
    expense: number
}

/** Newest day first; within a day, the latest entry first. */
export function groupByDate(txs: TransactionWithDetails[]): DayGroup[] {
    const byDate = new Map<string, DayGroup>()
    for (const tx of txs) {
        let g = byDate.get(tx.date)
        if (!g) { g = { date: tx.date, txs: [], income: 0, expense: 0 }; byDate.set(tx.date, g) }
        g.txs.push(tx)
        if (tx.type === 'income') g.income += tx.amount
        else g.expense += tx.amount
    }
    const groups = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
    for (const g of groups) g.txs.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    return groups
}

export type TypeFilter = 'all' | 'expense' | 'income'

export interface LedgerFilter {
    query: string
    type: TypeFilter
    /** A category id, 'none' for uncategorised, or null for any. */
    categoryId: string | null
}

export function applyFilter(txs: TransactionWithDetails[], { query, type, categoryId }: LedgerFilter): TransactionWithDetails[] {
    const q = query.trim().toLowerCase()
    return txs.filter(tx => {
        if (type !== 'all' && tx.type !== type) return false
        if (categoryId === 'none' ? tx.category_id !== null : categoryId && tx.category_id !== categoryId) return false
        if (!q) return true
        return [tx.note, tx.category?.name, tx.account.name, String(tx.amount)]
            .some(v => v?.toLowerCase().includes(q))
    })
}

export interface CategoryFacet {
    id: string
    name: string
    count: number
    total: number
}

/** The categories used in these transactions, biggest total first — the filter chips. */
export function categoryFacets(txs: TransactionWithDetails[]): CategoryFacet[] {
    const map = new Map<string, CategoryFacet>()
    for (const tx of txs) {
        if (!tx.category) continue
        const f = map.get(tx.category.id) ?? { id: tx.category.id, name: tx.category.name, count: 0, total: 0 }
        f.count++
        f.total += tx.amount
        map.set(tx.category.id, f)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
}

/** Spending (savings excluded) per day, for marking days over the daily allowance. */
export function dailySpending(txs: TransactionWithDetails[]): Map<string, number> {
    const map = new Map<string, number>()
    for (const tx of txs) {
        if (tx.type !== 'expense' || tx.category?.is_savings) continue
        map.set(tx.date, (map.get(tx.date) ?? 0) + tx.amount)
    }
    return map
}
