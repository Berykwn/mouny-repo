import { describe, expect, it } from 'vitest'
import { summarizeTransactions, unspentPct } from './period-summary'

describe('summarizeTransactions', () => {
    it('counts savings as expense but not as spending', () => {
        const s = summarizeTransactions([
            { type: 'income', amount: 10_000_000 },
            { type: 'expense', amount: 3_000_000, category: { is_savings: false } },
            { type: 'expense', amount: 2_000_000, category: { is_savings: true } },
            { type: 'expense', amount: 500_000, category: null },
        ])
        expect(s).toEqual({
            income: 10_000_000,
            expense: 5_500_000,
            savings: 2_000_000,
            spending: 3_500_000,
            net: 4_500_000,
            unspent: 6_500_000,
        })
    })

    it('is all zeros for no transactions', () => {
        expect(summarizeTransactions([])).toEqual({ income: 0, expense: 0, savings: 0, spending: 0, net: 0, unspent: 0 })
    })

    it('ignores unknown types', () => {
        expect(summarizeTransactions([{ type: 'transfer', amount: 999 }]).expense).toBe(0)
    })
})

describe('unspentPct', () => {
    it('rounds the share of the base', () => {
        expect(unspentPct(1, 3)).toBe(33)
        expect(unspentPct(-500, 1000)).toBe(-50)
    })

    it('is null without a positive base', () => {
        expect(unspentPct(100, 0)).toBeNull()
        expect(unspentPct(100, null)).toBeNull()
        expect(unspentPct(100, -1)).toBeNull()
    })
})
