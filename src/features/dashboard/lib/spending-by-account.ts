import { withSavingsMoves } from '@/lib/savings-moves'
import type { TransactionWithDetails } from '@/types'

export interface AccountSpending {
    id: string
    name: string
    type: string
    is_savings: boolean
    amount: number
}

/** Which accounts this period's spending came out of (savings excluded), biggest first. */
export function spendingByAccount(transactions: TransactionWithDetails[]): { byAccount: AccountSpending[]; totalSpending: number } {
    const spending = withSavingsMoves(transactions).filter(t => t.type === 'expense' && !t.category?.is_savings)
    const map = new Map<string, AccountSpending>()
    for (const tx of spending) {
        const entry = map.get(tx.account.id) ?? { id: tx.account.id, name: tx.account.name, type: tx.account.type, is_savings: tx.account.is_savings, amount: 0 }
        entry.amount += tx.amount
        map.set(tx.account.id, entry)
    }
    return {
        byAccount: Array.from(map.values()).sort((a, b) => b.amount - a.amount),
        totalSpending: spending.reduce((s, t) => s + t.amount, 0),
    }
}
