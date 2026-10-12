import { describe, expect, it } from 'vitest'
import { comparableSpending, diffPct } from './comparable-spending'

const open = {
    isClosed: false,
    projectedSpend: 9_000_000,
    totalSavings: 1_000_000,
    totalSpending: 3_000_000,
    reservedBills: 500_000,
    daysElapsed: 10,
}

describe('comparableSpending', () => {
    it('takes a closed period as it ended', () => {
        expect(comparableSpending({ ...open, isClosed: true, projectedSpend: null })).toEqual({ spending: 3_000_000, projected: false })
    })

    it('projects an open period, leaving savings out', () => {
        expect(comparableSpending(open)).toEqual({ spending: 8_000_000, projected: true })
    })

    it('waits in the first days rather than compare a day or two', () => {
        expect(comparableSpending({ ...open, projectedSpend: null, daysElapsed: 2 })).toBeNull()
    })

    it('falls back to spent so far plus bills due when there is no end date to project to', () => {
        expect(comparableSpending({ ...open, projectedSpend: null })).toEqual({ spending: 3_500_000, projected: false })
    })
})

describe('diffPct', () => {
    it('is the rounded change against a positive previous amount', () => {
        expect(diffPct(12, 10)).toBe(20)
        expect(diffPct(5, 10)).toBe(-50)
    })

    it('is null without a previous amount to divide by', () => {
        expect(diffPct(5, 0)).toBeNull()
        expect(diffPct(5, null)).toBeNull()
    })
})
