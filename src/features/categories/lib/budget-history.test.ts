import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import { budgetSuggestion, categoryTotals, roundBudgetUp } from './budget-history'

describe('categoryTotals', () => {
    it('adds up one category’s expenses per period', () => {
        const coffee = { id: 'coffee', name: 'Coffee' }
        const totals = categoryTotals('coffee', [
            [tx({ amount: 18_000, category: coffee }), tx({ amount: 12_000, category: coffee }), tx({ amount: 50_000, category: { id: 'food' } })],
            [],
            [tx({ type: 'income', amount: 99_000, category: coffee })],
        ])
        expect(totals).toEqual([30_000, 0, 0])
    })
})

describe('roundBudgetUp', () => {
    it('rounds to a step that suits the size', () => {
        expect(roundBudgetUp(365_000)).toBe(375_000)
        expect(roundBudgetUp(41_200)).toBe(45_000)
        expect(roundBudgetUp(11_500)).toBe(12_000)
    })
})

describe('budgetSuggestion', () => {
    it('suggests the median when the budget is broken in most periods', () => {
        const s = budgetSuggestion([380_000, 340_000, 365_000, 400_000, 300_000, 370_000], 350_000)
        expect(s).toEqual({ overCount: 4, periodCount: 6, median: 367_500, suggested: 375_000 })
    })

    it('stays quiet when the budget mostly holds', () => {
        expect(budgetSuggestion([380_000, 300_000, 310_000, 320_000], 350_000)).toBeNull()
    })

    it('needs a budget and a few periods of history', () => {
        expect(budgetSuggestion([500_000, 500_000], 350_000)).toBeNull()
        expect(budgetSuggestion([500_000, 500_000, 500_000], null)).toBeNull()
    })
})
