import { describe, expect, it } from 'vitest'
import { calculateHealthScore } from './calculate-health-score'

const base = { totalIncome: 10_000_000, totalSpending: 5_000_000, totalBalance: 20_000_000, totalDebt: 0, expenseDiffPct: null }

describe('calculateHealthScore', () => {
    it('is Excellent with a high savings rate and no debt', () => {
        const r = calculateHealthScore(base)
        expect(r.score).toBe(100)
        expect(r.label).toBe('Excellent')
        expect(r.periodReasons).toEqual(['50% of income unspent'])
        expect(r.overallReasons).toEqual(['No debt'])
    })

    it('penalises overspending hardest', () => {
        const r = calculateHealthScore({ ...base, totalSpending: 12_000_000 })
        expect(r.score).toBe(50)
        expect(r.periodReasons).toContain('Spent more than income')
    })

    it('words a low rate as "only"', () => {
        expect(calculateHealthScore({ ...base, totalSpending: 9_500_000 }).periodReasons).toEqual(['Only 5% of income unspent'])
    })

    it('says when the period part is a projection', () => {
        const r = calculateHealthScore({ ...base, expenseDiffPct: 30, projected: true })
        expect(r.score).toBe(90)
        expect(r.periodReasons).toEqual(['On pace for 50% of income unspent', 'Spending on pace for +30% vs last'])
        expect(calculateHealthScore({ ...base, totalSpending: 12_000_000, projected: true }).periodReasons)
            .toEqual(['On pace to spend more than income'])
    })

    it('treats spending with no income as the worst case', () => {
        const r = calculateHealthScore({ ...base, totalIncome: 0, totalSpending: 1 })
        expect(r.score).toBe(50)
        expect(r.periodReasons).toEqual(['Spending with no income'])
    })

    it('scores debt against balance, and debt with no balance as exceeding it', () => {
        expect(calculateHealthScore({ ...base, totalDebt: 12_000_000 }).score).toBe(80)
        expect(calculateHealthScore({ ...base, totalDebt: 25_000_000 }).score).toBe(70)
        const broke = calculateHealthScore({ ...base, totalBalance: 0, totalDebt: 1 })
        expect(broke.score).toBe(70)
        expect(broke.overallReasons).toEqual(['Debt exceeds balance'])
    })

    it('penalises a rise in expenses and notes a fall', () => {
        expect(calculateHealthScore({ ...base, expenseDiffPct: 60 }).score).toBe(80)
        expect(calculateHealthScore({ ...base, expenseDiffPct: 30 }).score).toBe(90)
        const down = calculateHealthScore({ ...base, expenseDiffPct: -15 })
        expect(down.score).toBe(100)
        expect(down.periodReasons).toContain('Spending -15% vs last')
    })

    it('never goes below zero', () => {
        const r = calculateHealthScore({ totalIncome: 1, totalSpending: 100, totalBalance: 0, totalDebt: 1, expenseDiffPct: 100 })
        expect(r.score).toBe(0)
        expect(r.label).toBe('Poor')
    })
})
