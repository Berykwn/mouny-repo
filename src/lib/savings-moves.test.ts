import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import { withSavingsMoves } from './savings-moves'
import { summarizeTransactions } from './period-summary'

const everyday = { id: 'bca', name: 'BCA', type: 'bank', is_savings: false }
const savings = { id: 'jago', name: 'Jago', type: 'bank', is_savings: true }
const savings2 = { id: 'bibit', name: 'Bibit', type: 'bank', is_savings: true }

const transfer = (id: string, from: typeof everyday, to: typeof everyday, amount: number) => [
    tx({ id: `${id}-out`, type: 'transfer_out', transfer_id: id, amount, account: from, account_id: from.id }),
    tx({ id: `${id}-in`, type: 'transfer_in', transfer_id: id, amount, account: to, account_id: to.id }),
]

describe('withSavingsMoves', () => {
    it('counts a move into savings as a savings expense', () => {
        const rows = withSavingsMoves([tx({ type: 'income', amount: 10_000_000 }), ...transfer('t1', everyday, savings, 2_000_000)])
        const moved = rows.filter(r => r.category?.id === 'savings-move')
        expect(moved).toHaveLength(1)
        expect(moved[0]).toMatchObject({ type: 'expense', amount: 2_000_000 })
        expect(summarizeTransactions(rows)).toMatchObject({ income: 10_000_000, savings: 2_000_000, spending: 0, net: 8_000_000, unspent: 10_000_000 })
    })

    it('takes a move back out off what was saved', () => {
        const rows = withSavingsMoves([...transfer('t1', everyday, savings, 2_000_000), ...transfer('t2', savings, everyday, 500_000)])
        expect(summarizeTransactions(rows).savings).toBe(1_500_000)
    })

    it('changes nothing when run over its own output', () => {
        const once = withSavingsMoves(transfer('t1', everyday, savings, 2_000_000))
        expect(withSavingsMoves(once)).toEqual(once)
    })

    it('counts income paid straight into savings as saved, so moving it out is not counted twice', () => {
        const salary = tx({ type: 'income', amount: 10_000_000, account: savings, account_id: savings.id })
        const rows = withSavingsMoves([salary, ...transfer('t1', savings, everyday, 10_000_000)])
        expect(summarizeTransactions(rows)).toMatchObject({ income: 10_000_000, savings: 0, spending: 0, net: 10_000_000 })
        // Still sitting in savings: saved, not spendable.
        expect(summarizeTransactions([salary])).toMatchObject({ savings: 10_000_000, net: 0 })
    })

    it('takes spending from a savings account off what was saved', () => {
        const rows = [
            tx({ type: 'income', amount: 10_000_000 }),
            ...transfer('t1', everyday, savings, 3_000_000),
            tx({ type: 'expense', amount: 2_000_000, account: savings, account_id: savings.id, category: { is_savings: false } }),
        ]
        // BCA holds 7jt; 1jt is still in savings.
        expect(summarizeTransactions(rows)).toMatchObject({ savings: 1_000_000, spending: 2_000_000, net: 7_000_000 })
    })

    it('changes nothing when run over its own output, with savings income and spending', () => {
        const once = withSavingsMoves([
            tx({ type: 'income', amount: 5_000_000, account: savings, account_id: savings.id }),
            tx({ type: 'expense', amount: 1_000_000, account: savings, account_id: savings.id, category: { is_savings: false } }),
        ])
        expect(once).toHaveLength(4)
        expect(withSavingsMoves(once)).toEqual(once)
    })

    it('ignores moves between savings accounts and ordinary transfers', () => {
        const rows = withSavingsMoves([...transfer('t1', savings, savings2, 1_000_000), ...transfer('t2', everyday, { ...everyday, id: 'cash' }, 300_000)])
        expect(rows.every(r => r.type.startsWith('transfer'))).toBe(true)
        expect(summarizeTransactions(rows).savings).toBe(0)
    })
})
