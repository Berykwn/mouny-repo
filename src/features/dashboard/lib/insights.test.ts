import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { BillDue } from '@/features/bills/lib/bills'
import type { RecurringBill } from '@/types'
import { generateInsights, type InsightInput } from './insights'

function stats(overrides: Partial<PeriodStats> = {}): PeriodStats {
    return {
        totalIncome: 10_000_000,
        totalExpense: 2_000_000,
        totalSavings: 0,
        totalSpending: 2_000_000,
        oneOffSpending: 0,
        remaining: 8_000_000,
        reservedBills: 0,
        spentPercent: 20,
        daysElapsed: 12,
        totalDays: 30,
        daysRemaining: 18,
        dailyAvg: 150_000,
        safeDaily: 400_000,
        projectedSpend: 4_700_000,
        projectedClose: 5_300_000,
        runwayDays: 53,
        noSpendDays: 0,
        isEndDateEstimated: false,
        isClosed: false,
        ...overrides,
    }
}

const food = { id: 'food', name: 'Food & Drinks', kind: 'daily' }
const rent = { id: 'rent', name: 'Rent', kind: 'fixed' }

function input(overrides: Partial<InsightInput> = {}): InsightInput {
    return {
        today: '2026-10-12',
        periodStart: '2026-10-01',
        stats: stats(),
        transactions: [tx({ amount: 2_000_000, date: '2026-10-05', category: food })],
        history: [],
        dues: [],
        subscriptionsPerYear: 0,
        ...overrides,
    }
}

function due(name: string, status: BillDue['status'], reserved: number): BillDue {
    return {
        bill: { id: name, name, amount: reserved } as RecurringBill,
        dueDates: ['2026-10-14'],
        payments: [],
        paidAmount: 0,
        outstanding: 1,
        reserved,
        nextDue: '2026-10-14',
        status,
    }
}

const ids = (i: InsightInput) => generateInsights(i).map(x => x.id)

describe('generateInsights', () => {
    it('warns with a date when money runs out before the period ends', () => {
        const [first] = generateInsights(input({ stats: stats({ runwayDays: 12, daysRemaining: 18 }) }))
        expect(first).toMatchObject({ id: 'run-out', tone: 'warning' })
        expect(first.text).toContain('24 Oct')
        expect(first.text).toContain('6 days before')
    })

    it('says on track otherwise', () => {
        expect(ids(input())).toContain('on-track')
    })

    it('puts overdue bills near the top', () => {
        const result = ids(input({ dues: [due('Internet', 'overdue', 350_000), due('Netflix', 'soon', 186_000)] }))
        expect(result.slice(0, 2)).toEqual(['bills-overdue', 'bills-soon'])
    })

    it('compares a category with earlier periods at the same day, leaving bills out', () => {
        const history = [
            { start_date: '2026-09-01', transactions: [tx({ amount: 800_000, date: '2026-09-08', category: food }), tx({ amount: 3_000_000, date: '2026-09-02', category: rent })] },
            { start_date: '2026-08-01', transactions: [tx({ amount: 1_000_000, date: '2026-08-10', category: food }), tx({ amount: 900_000, date: '2026-08-25', category: food })] },
        ]
        const result = generateInsights(input({
            history,
            transactions: [tx({ amount: 1_500_000, date: '2026-10-05', category: food }), tx({ amount: 3_000_000, date: '2026-10-02', category: rent })],
            stats: stats({ totalSpending: 4_500_000 }),
        }))
        const up = result.find(i => i.id === 'category-up')
        // Usual by day 12 is (800k + 1m) / 2 = 900k; Aug's day-25 spend doesn't count yet.
        expect(up?.text).toBe('Food & Drinks is 67% above your usual by day 12 (1.5jt vs 900rb).')
    })

    it('compares total spending with last period at the same day', () => {
        const history = [{ start_date: '2026-09-01', transactions: [tx({ amount: 3_000_000, date: '2026-09-04', category: food })] }]
        const result = generateInsights(input({ history }))
        expect(result.find(i => i.id === 'vs-last')).toMatchObject({ tone: 'positive' })
        expect(result.find(i => i.id === 'vs-last')?.text).toContain('33% less than last period by day 12')
    })

    it('waits until day 5 before comparing', () => {
        const history = [{ start_date: '2026-09-01', transactions: [tx({ amount: 3_000_000, date: '2026-09-02', category: food })] }]
        expect(ids(input({ today: '2026-10-03', history }))).not.toContain('vs-last')
    })

    it('shows at most four, most pressing first', () => {
        const result = generateInsights(input({
            stats: stats({ runwayDays: 5, noSpendDays: 3 }),
            dues: [due('Internet', 'overdue', 350_000), due('Netflix', 'soon', 186_000)],
            subscriptionsPerYear: 2_400_000,
        }))
        expect(result).toHaveLength(4)
        expect(result.map(i => i.priority)).toEqual([...result.map(i => i.priority)].sort((a, b) => b - a))
    })

    it('has a quiet line before any spending', () => {
        expect(ids(input({ stats: stats({ totalSpending: 0 }), transactions: [] }))).toEqual(['no-spend'])
    })
})
