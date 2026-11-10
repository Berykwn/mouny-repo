import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import type { PeriodStats } from '@/hooks/use-period-stats'
import { keptForecast, keptOf, summarizeTransactions } from '@/lib/period-summary'
import { periodRecap } from '@/features/periods/lib/period-recap'
import {
    categoryVariance, forecastKept, frequentNotes, median, paceSeries, spendingHeatmap, standOuts, timeBand, whatIf,
    type PastPeriod,
} from './analysis'

function stats(overrides: Partial<PeriodStats> = {}): PeriodStats {
    return {
        totalIncome: 10_000_000,
        totalExpense: 2_000_000,
        totalSavings: 0,
        totalSpending: 2_000_000,
        oneOffSpending: 0,
        remaining: 8_000_000,
        reservedBills: 0,
        daysElapsed: 10,
        totalDays: 30,
        daysRemaining: 20,
        dailyAvg: 200_000,
        safeDaily: 380_000,
        projectedSpend: 6_000_000,
        projectedClose: 4_000_000,
        runwayDays: 40,
        noSpendDays: 0,
        isEndDateEstimated: false,
        isClosed: false,
        ...overrides,
    }
}

const coffee = { id: 'coffee', name: 'Coffee', kind: 'lifestyle' }
const food = { id: 'food', name: 'Food', kind: 'daily' }
const rent = { id: 'rent', name: 'Rent', kind: 'fixed' }

const period = (start: string, transactions: PastPeriod['transactions']): PastPeriod => ({ start_date: start, end_date: null, transactions })

describe('median', () => {
    it('takes the middle, or the mean of the two middles', () => {
        expect(median([])).toBeNull()
        expect(median([3, 1, 2])).toBe(2)
        expect(median([4, 1, 3, 2])).toBe(2.5)
    })
})

describe('forecastKept', () => {
    it('is kept so far less the pace over the days left and the bills to come, with a range from the daily spread', () => {
        const txs = [tx({ date: '2026-10-01', amount: 200_000, category: food }), tx({ date: '2026-10-02', amount: 0, category: food })]
        // 10jt − 2jt spent − 200rb × 20 days − 300rb of bills still to come.
        const f = forecastKept(stats({ totalSavings: 500_000 }), '2026-10-01', txs, { toCome: 300_000, dueNow: 0 })!
        expect(f.kept).toBe(3_700_000)
        expect(f.spendByEnd).toBe(6_300_000)
        expect(f.low).toBeLessThan(f.kept)
        expect(f.high - f.kept).toBeCloseTo(f.kept - f.low)
        expect(f.rate).toBeCloseTo(0.37)
    })

    it('leaves bills already due out of kept, and says how much they are', () => {
        const f = forecastKept(stats(), '2026-10-01', [], { toCome: 0, dueNow: 405_000 })!
        expect(f.kept).toBe(4_000_000)
        expect(f.dueNow).toBe(405_000)
    })

    it('has nothing to forecast for a closed period', () => {
        expect(forecastKept(stats({ isClosed: true }), '2026-10-01', [])).toBeNull()
    })
})

describe('forecast kept against what Close reports', () => {
    // The period from the walkthrough: past its estimated payday, two bills still unpaid.
    const rows = [
        tx({ type: 'income', amount: 9_500_000, date: '2026-10-10' }),
        tx({ amount: 2_000_000, date: '2026-10-12', category: rent }),
        tx({ amount: 4_488_000, date: '2026-10-20', category: food }),
        tx({ amount: 1_675_000, date: '2026-10-21', category: { id: 'inv', name: 'Investments', kind: 'savings', is_savings: true } }),
    ]
    const summary = summarizeTransactions(rows)
    const lastDay = stats({
        totalIncome: summary.income,
        totalExpense: summary.expense,
        totalSavings: summary.savings,
        totalSpending: summary.spending,
        reservedBills: 405_000,
        remaining: summary.net - 405_000,
        daysElapsed: 30,
        totalDays: 30,
        daysRemaining: 0,
        dailyAvg: 124_000,
        projectedSpend: summary.expense + 405_000,
        projectedClose: summary.net - 405_000,
    })

    it('is the same number with no days left', () => {
        // Everything still unpaid is due by now, so none of it is "to come".
        const f = forecastKept(lastDay, '2026-10-10', rows, { toCome: 0, dueNow: 405_000 })!
        expect(f.kept).toBe(periodRecap(rows, []).kept)
        expect(f.kept).toBe(3_012_000)
    })

    it('uses the one definition of kept', () => {
        expect(keptOf(summary.income, summary.spending)).toBe(summary.unspent)
        expect(keptForecast({ income: summary.income, spending: summary.spending, dailyPace: 124_000, daysRemaining: 0, billsToCome: 0 })).toBe(summary.unspent)
    })
})

describe('paceSeries', () => {
    it('runs actual spending to today, then a forecast to the end, inside the earlier range', () => {
        const s = stats({ daysElapsed: 2, totalDays: 4, daysRemaining: 2 })
        const points = paceSeries(s, '2026-10-01', [tx({ date: '2026-10-01', amount: 100_000 }), tx({ date: '2026-10-02', amount: 100_000 })], [
            period('2026-09-01', [tx({ date: '2026-09-01', amount: 50_000 })]),
            period('2026-08-01', [tx({ date: '2026-08-02', amount: 300_000 })]),
        ], 400_000)
        expect(points.map(p => p.actual)).toEqual([100_000, 200_000, undefined, undefined])
        expect(points.map(p => p.forecast)).toEqual([undefined, 200_000, 300_000, 400_000])
        expect(points[0].band).toEqual([0, 50_000])
        expect(points[1].band).toEqual([50_000, 300_000])
    })
})

describe('categoryVariance', () => {
    it('compares each habit category on pace against its median, leaving bills out', () => {
        const history = [
            period('2026-09-01', [tx({ amount: 300_000, category: coffee }), tx({ amount: 1_000_000, category: food }), tx({ amount: 3_000_000, category: rent })]),
            period('2026-08-01', [tx({ amount: 300_000, category: coffee }), tx({ amount: 1_000_000, category: food })]),
            period('2026-07-01', [tx({ amount: 900_000, category: coffee }), tx({ amount: 1_020_000, category: food })]),
        ]
        // A third of the way in: 138rb of coffee is on pace for 414rb.
        const now = [tx({ amount: 138_000, category: coffee }), tx({ amount: 250_000, category: food }), tx({ amount: 3_000_000, category: rent })]
        const result = categoryVariance(stats(), now, history)
        expect(result.map(r => [r.name, r.pct])).toEqual([['Coffee', 38], ['Food', -25]])
    })

    it('hides changes within 5%', () => {
        const history = [period('2026-09-01', [tx({ amount: 300_000, category: coffee })])]
        expect(categoryVariance(stats({ isClosed: true }), [tx({ amount: 310_000, category: coffee })], history)).toEqual([])
    })

    it('needs history', () => {
        expect(categoryVariance(stats(), [tx({ amount: 1, category: coffee })], [])).toEqual([])
    })

    it('counts a big one-off once instead of stretching it over the period', () => {
        const shopping = { id: 'shopping', name: 'Shopping', kind: 'lifestyle' }
        const history = [
            period('2026-09-01', [tx({ amount: 1_000_000, category: shopping })]),
            period('2026-08-01', [tx({ amount: 1_000_000, category: shopping })]),
        ]
        // Day 5 of 30: a 5jt phone (half the income) plus 100rb of everyday shopping.
        const now = [tx({ amount: 5_000_000, category: shopping }), tx({ amount: 100_000, category: shopping })]
        const [result] = categoryVariance(stats({ daysElapsed: 5 }), now, history)
        expect(result.current).toBe(5_000_000 + 100_000 * 6)
        expect(result.pct).toBe(460)
    })
})

describe('standOuts', () => {
    it('flags entries at least twice the usual single entry of their category', () => {
        const history = [period('2026-09-01', [20_000, 25_000, 30_000].map(amount => tx({ amount, category: coffee })))]
        const big = tx({ amount: 100_000, category: coffee })
        const result = standOuts([tx({ amount: 30_000, category: coffee }), big], history)
        expect(result).toHaveLength(1)
        expect(result[0].tx).toBe(big)
        expect(result[0].multiple).toBe(4)
    })

    it('waits for enough history in the category', () => {
        const history = [period('2026-09-01', [tx({ amount: 10_000, category: coffee })])]
        expect(standOuts([tx({ amount: 100_000, category: coffee })], history)).toEqual([])
    })
})

describe('spendingHeatmap', () => {
    it('places entries by weekday and the time they were made, averaged per week', () => {
        // 2026-10-24 is a Saturday.
        const at = (date: string, hour: number) => new Date(`${date}T${String(hour).padStart(2, '0')}:30:00`).toISOString()
        const map = spendingHeatmap([
            tx({ date: '2026-10-24', created_at: at('2026-10-24', 19), amount: 90_000, category: coffee }),
            tx({ date: '2026-10-23', created_at: at('2026-10-23', 8), amount: 10_000, category: food }),
            // Logged a day later: its time isn't the spending's.
            tx({ date: '2026-10-22', created_at: at('2026-10-23', 9), amount: 50_000, category: food }),
            tx({ date: '2026-10-22', created_at: at('2026-10-22', 9), amount: 1_000_000, category: rent }),
        ], '2026-10-24')
        expect(map.weeks).toBe(1)
        expect(map.cells[5][3]).toBe(90_000)
        expect(map.cells[4][0]).toBe(10_000)
        expect(map.untimed).toBe(1)
        expect(map.top).toEqual({ weekday: 'Saturday', band: 'Evening', share: 0.9 })
    })

    it('bands the hours', () => {
        expect([5, 6, 11, 14, 18, 22, 1].map(timeBand)).toEqual([4, 0, 1, 2, 3, 4, 4])
    })
})

describe('frequentNotes', () => {
    it('groups by exact note, case ignored, from three entries', () => {
        const { notes, variableTotal } = frequentNotes([
            ...[1, 2, 3].map(() => tx({ note: 'Kopi', amount: 20_000, category: coffee })),
            tx({ note: 'kopi ', amount: 20_000, category: coffee }),
            ...[1, 2].map(() => tx({ note: 'Warteg', amount: 15_000, category: food })),
        ])
        expect(notes).toEqual([{ note: 'Kopi', count: 4, total: 80_000 }])
        expect(variableTotal).toBe(110_000)
    })
})

describe('whatIf', () => {
    it('adds the daily cut over the days left, and over a whole period', () => {
        expect(whatIf(stats(), { kept: 4_000_000 }, 10_000)).toEqual({ before: 4_000_000, after: 4_200_000, perPeriod: 300_000 })
    })

    it('starts from the same forecast This period shows', () => {
        const forecast = forecastKept(stats(), '2026-10-01', [], { toCome: 250_000, dueNow: 0 })!
        expect(whatIf(stats(), forecast, 0)?.before).toBe(forecast.kept)
    })

    it('has nothing to change in a closed period, or without a forecast', () => {
        expect(whatIf(stats({ isClosed: true }), { kept: 1 }, 10_000)).toBeNull()
        expect(whatIf(stats(), null, 10_000)).toBeNull()
    })
})
