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
    id?: string
    type: string
    amount: number
    transfer_id?: string | null
    account?: { is_savings?: boolean | null } | null
    category?: { id?: string } | null
}

/** Id of the savings row that stands beside a savings account's own income or expense. */
const savedId = (id: string | undefined) => `${id}:saved`

/**
 * The rows the period's numbers are worked out from. Money in a savings account is still
 * yours but set aside, so what goes in and out of savings accounts counts the way an
 * expense in a savings category does:
 *
 * - a move from an everyday account into a savings account becomes a savings expense,
 *   negative when money comes back out to an everyday account;
 * - income paid straight into a savings account is saved: a savings expense of the same
 *   amount stands beside it, so it isn't spendable;
 * - spending from a savings account comes out of what's saved: a negative savings expense
 *   stands beside it, so moving the money out later can't count it twice.
 *
 * Moves between two savings accounts, and every other transfer, stay transfers, which the
 * numbers ignore. The ledger shows the real rows; only totals and stats use these. Mirrors
 * period_summaries in the database.
 */
export function withSavingsMoves<T extends MoveRow>(rows: T[]): T[] {
    const legsByTransfer = new Map<string, T[]>()
    const ids = new Set<string | undefined>()
    let touchesSavings = false
    for (const row of rows) {
        ids.add(row.id)
        if (row.account?.is_savings) touchesSavings = true
        if (!row.transfer_id) continue
        const legs = legsByTransfer.get(row.transfer_id) ?? []
        legs.push(row)
        legsByTransfer.set(row.transfer_id, legs)
    }
    if (!touchesSavings) return rows

    return rows.flatMap(row => {
        // Rows this made already stay as they are: running it again over its own output
        // must change nothing.
        if (!row.account?.is_savings || row.category?.id === SAVINGS_MOVE_CATEGORY.id) return [row]

        if (row.type === 'income' || row.type === 'expense') {
            if (ids.has(savedId(row.id))) return [row]
            const saved = {
                ...row,
                id: savedId(row.id),
                type: 'expense',
                amount: row.type === 'income' ? row.amount : -row.amount,
                category: SAVINGS_MOVE_CATEGORY,
            }
            return [row, saved]
        }

        if (!isTransfer(row.type) || !row.transfer_id) return [row]
        const fromEveryday = legsByTransfer.get(row.transfer_id)!.some(o => o !== row && !o.account?.is_savings)
        if (!fromEveryday) return [row]
        return [{
            ...row,
            type: 'expense',
            amount: row.type === 'transfer_in' ? row.amount : -row.amount,
            category: SAVINGS_MOVE_CATEGORY,
        }]
    })
}
