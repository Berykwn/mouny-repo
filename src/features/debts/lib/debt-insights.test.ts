import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debt } from '@/test/fixtures'
import { debtProgress, dueStatus, payoffPlan, sortByUrgency, summarize, upcoming } from './debt-insights'

const TODAY = '2026-10-01'
// A steady 50k/day leftover over 30-day periods.
const pace = { perPeriod: 1_500_000, periodDays: 30, perDay: 50_000, basedOn: 3 }

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${TODAY}T09:00:00+07:00`))
})
afterEach(() => vi.useRealTimers())

describe('dueStatus', () => {
    it('buckets by days until due', () => {
        expect(dueStatus(debt())).toEqual({ kind: 'none' })
        expect(dueStatus(debt({ due_date: '2026-09-28' }))).toEqual({ kind: 'overdue', days: 3 })
        expect(dueStatus(debt({ due_date: TODAY }))).toEqual({ kind: 'today' })
        expect(dueStatus(debt({ due_date: '2026-10-08' }))).toEqual({ kind: 'soon', days: 7 })
        expect(dueStatus(debt({ due_date: '2026-10-09' }))).toEqual({ kind: 'later', days: 8 })
    })
})

describe('debtProgress', () => {
    it('reports paid amount and percent, safe with a zero total', () => {
        expect(debtProgress(debt({ total_amount: 1_000_000, remaining_amount: 250_000 }))).toEqual({ paid: 750_000, percent: 75 })
        expect(debtProgress(debt({ total_amount: 0, remaining_amount: 0 })).percent).toBe(0)
    })
})

describe('sortByUrgency / upcoming', () => {
    it('puts overdue first, undated last, bigger first on ties', () => {
        const undated = debt({ id: 'undated' })
        const later = debt({ id: 'later', due_date: '2026-11-15' })
        const overdue = debt({ id: 'overdue', due_date: '2026-09-20' })
        const soonSmall = debt({ id: 'soon-small', due_date: '2026-10-05', remaining_amount: 100 })
        const soonBig = debt({ id: 'soon-big', due_date: '2026-10-05', remaining_amount: 900 })
        expect(sortByUrgency([undated, later, soonSmall, overdue, soonBig]).map(d => d.id))
            .toEqual(['overdue', 'soon-big', 'soon-small', 'later', 'undated'])
    })

    it('upcoming keeps overdue and the next 30 days only', () => {
        const ids = upcoming([
            debt({ id: 'overdue', due_date: '2026-09-20' }),
            debt({ id: 'in-30', due_date: '2026-10-31' }),
            debt({ id: 'in-31', due_date: '2026-11-01' }),
            debt({ id: 'undated' }),
        ]).map(d => d.id)
        expect(ids).toEqual(['overdue', 'in-30'])
    })
})

describe('summarize', () => {
    it('totals each side and picks the nearest due-soon record', () => {
        const s = summarize([
            debt({ type: 'debt', remaining_amount: 300_000, due_date: '2026-09-29' }),
            debt({ id: 'next', type: 'debt', remaining_amount: 200_000, due_date: '2026-10-03' }),
            debt({ type: 'receivable', remaining_amount: 50_000, due_date: '2026-10-05' }),
        ])
        expect(s.owed).toBe(500_000)
        expect(s.receivable).toBe(50_000)
        expect(s.debtCount).toBe(2)
        expect(s.receivableCount).toBe(1)
        expect(s.overdueDebts).toHaveLength(1)
        expect(s.nextDue?.id).toBe('next')
    })
})

describe('payoffPlan', () => {
    it('clears debts one after another from the leftover pace', () => {
        const plan = payoffPlan([
            debt({ id: 'a', remaining_amount: 500_000, due_date: '2026-10-20' }),
            debt({ id: 'b', remaining_amount: 1_000_000, due_date: '2026-10-25' }),
        ], pace, TODAY)

        // a: 500k / 50k = 10 days. a+b: 1.5m / 50k = 30 days.
        expect(plan.stops.map(s => [s.debt.id, s.date, s.status])).toEqual([
            ['a', '2026-10-11', 'on-track'],
            ['b', '2026-10-31', 'behind'],
        ])
        expect(plan.debtFreeDate).toBe('2026-10-31')
    })

    it('ignores receivables and paid debts', () => {
        const plan = payoffPlan([
            debt({ type: 'receivable', remaining_amount: 100 }),
            debt({ remaining_amount: 0 }),
        ], pace, TODAY)
        expect(plan.stops).toEqual([])
        expect(plan.debtFreeDate).toBeNull()
    })

    it('splits a dated debt over the periods left, and asks for all of an overdue one', () => {
        // 60 days left at 30 days a period: 61/30 rounds up to 3 periods.
        const dated = payoffPlan([debt({ remaining_amount: 900_000, due_date: '2026-11-30' })], pace, TODAY)
        expect(dated.stops[0].perPeriodNeeded).toBe(300_000)
        expect(dated.thisPeriod).toBe(300_000)

        const overdue = payoffPlan([debt({ remaining_amount: 900_000, due_date: '2026-09-01' })], pace, TODAY)
        expect(overdue.stops[0].status).toBe('overdue')
        expect(overdue.thisPeriod).toBe(900_000)
    })

    it('has no dates without a positive pace', () => {
        const plan = payoffPlan([debt({ due_date: '2026-12-01' })], null, TODAY)
        expect(plan.stops[0]).toMatchObject({ date: null, status: 'unknown' })
        expect(plan.debtFreeDate).toBeNull()

        const negative = payoffPlan([debt()], { ...pace, perDay: -10 }, TODAY)
        expect(negative.stops[0]).toMatchObject({ date: null, status: 'no-date' })
    })

    it('gives up on estimates more than ten years out', () => {
        const plan = payoffPlan([debt({ remaining_amount: 1_000_000_000 })], { ...pace, perDay: 1 }, TODAY)
        expect(plan.stops[0].date).toBeNull()
        expect(plan.debtFreeDate).toBeNull()
    })
})
