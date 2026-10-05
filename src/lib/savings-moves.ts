import { CATEGORY_KIND_META } from './category-kind'
import { isTransfer } from './transaction-type'

/** Stands in for a category on money moved into or out of a savings account. */
export const SAVINGS_MOVE_CATEGORY = {
    id: 'savings-move',
    name: 'Moved to savings',
    color: CATEGORY_KIND_META.savings.color,
    bg_color: null,
    icon: 'piggy-bank',
    is_savings: true,
    kind: 'savings',
}

type MoveRow = {
    type: string
    amount: number
    transfer_id?: string | null
    account?: { is_savings?: boolean | null } | null
}

/**
 * The rows the period's numbers are worked out from. Money moved into a savings account
 * is still yours but set aside, so it counts the way an expense in a savings category
 * does: saved, and gone from what's left to spend. Each such move becomes a savings
 * expense, negative when money comes back out to an everyday account. Moves between two
 * savings accounts, and every other transfer, stay transfers, which the numbers ignore.
 * The ledger shows the real rows; only totals and stats use these.
 */
export function withSavingsMoves<T extends MoveRow>(rows: T[]): T[] {
    const legsByTransfer = new Map<string, T[]>()
    for (const row of rows) {
        if (!row.transfer_id) continue
        const legs = legsByTransfer.get(row.transfer_id) ?? []
        legs.push(row)
        legsByTransfer.set(row.transfer_id, legs)
    }
    if (legsByTransfer.size === 0) return rows

    return rows.map(row => {
        // Only transfer rows: running this again over its own output must change nothing.
        if (!isTransfer(row.type) || !row.transfer_id || !row.account?.is_savings) return row
        const fromEveryday = legsByTransfer.get(row.transfer_id)!.some(o => o !== row && !o.account?.is_savings)
        if (!fromEveryday) return row
        return {
            ...row,
            type: 'expense',
            amount: row.type === 'transfer_in' ? row.amount : -row.amount,
            category: SAVINGS_MOVE_CATEGORY,
        }
    })
}
