import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import { median, periodRecap } from './period-recap'

const income = (amount: number) => tx({ type: 'income', amount })
const coffee = (amount: number) => tx({ amount, category: { id: 'coffee', name: 'Coffee' } })
const transport = (amount: number) => tx({ amount, category: { id: 'transport', name: 'Transport' } })
const saved = (amount: number) => tx({ amount, category: { id: 'save', name: 'Savings', is_savings: true } })

describe('median', () => {
    it('takes the middle value, or the mean of the two middle ones', () => {
        expect(median([3, 1, 2])).toBe(2)
        expect(median([4, 1, 2, 3])).toBe(2.5)
        expect(median([])).toBeNull()
    })
})

describe('periodRecap', () => {
    const history = [
        [income(10_000_000), coffee(300_000), transport(800_000)],
        [income(10_000_000), coffee(300_000), transport(800_000)],
        [income(10_000_000), coffee(300_000), transport(800_000)],
    ]

    it('puts what was kept next to the usual share', () => {
        const recap = periodRecap([income(10_000_000), coffee(400_000), saved(1_000_000)], history)
        // Savings don't count as spending: 10jt − 400rb kept.
        expect(recap.kept).toBe(9_600_000)
        expect(recap.keptPct).toBe(96)
        expect(recap.medianPct).toBe(89)
    })

    it('names the biggest rise and drop against the usual', () => {
        const recap = periodRecap([income(10_000_000), coffee(414_000), transport(656_000)], history)
        expect(recap.changes.map(c => [c.name, c.pct])).toEqual([['Coffee', 38], ['Transport', -18]])
    })

    it('ignores small moves and stays quiet without history', () => {
        expect(periodRecap([income(10_000_000), coffee(310_000), transport(800_000)], history).changes).toEqual([])
        expect(periodRecap([income(10_000_000), coffee(900_000)], history.slice(0, 1))).toMatchObject({ changes: [], medianPct: null })
    })

    it('picks the largest expense, savings left out', () => {
        const big = transport(186_000)
        const recap = periodRecap([income(1_000_000), saved(500_000), big, coffee(20_000)], [])
        expect(recap.biggest).toBe(big)
    })
})
