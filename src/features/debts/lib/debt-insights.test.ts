import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debt } from '@/test/fixtures'
import { debtProgress, dueStatus, fasterPayoff, payoffPlan, payoffSchedule, sortByUrgency, summarize } from './debt-insights'

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

describe('sortByUrgency', () => {
    it('puts overdue first, undated last, bigger first on ties', () => {
        const undated = debt({ id: 'undated' })
        const later = debt({ id: 'later', due_date: '2026-11-15' })
        const overdue = debt({ id: 'overdue', due_date: '2026-09-20' })
        const soonSmall = debt({ id: 'soon-small', due_date: '2026-10-05', remaining_amount: 100 })
        const soonBig = debt({ id: 'soon-big', due_date: '2026-10-05', remaining_amount: 900 })
        expect(sortByUrgency([undated, later, soonSmall, overdue, soonBig]).map(d => d.id))
            .toEqual(['overdue', 'soon-big', 'soon-small', 'later', 'undated'])
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
        expect(dated.stops[0].periodsLeft).toBe(3)
        expect(dated.thisPeriod).toBe(300_000)

        const overdue = payoffPlan([debt({ remaining_amount: 900_000, due_date: '2026-09-01' })], pace, TODAY)
        expect(overdue.stops[0].status).toBe('overdue')
        expect(overdue.thisPeriod).toBe(900_000)
    })

    it('marks this period done once its payments reach the share, and spreads the rest after it', () => {
        // 900k over 3 periods is 300k each; 300k was paid this period, 600k is left.
        const d = debt({ id: 'd', remaining_amount: 600_000, due_date: '2026-11-30' })
        const plan = payoffPlan([d], pace, TODAY, { d: 300_000 })
        expect(plan.stops[0]).toMatchObject({ paidThisPeriod: 300_000, thisPeriodDue: 0, doneThisPeriod: true })
        expect(plan.thisPeriod).toBe(0)
        expect(payoffSchedule(plan.stops[0])).toEqual([
            { label: 'This period', amount: 0, last: false, done: true },
            { label: 'Next period', amount: 300_000, last: false, done: false },
            { label: 'Period 3', amount: 300_000, last: true, done: false },
        ])
    })

    it('asks only for what is left of the share after a part payment', () => {
        const d = debt({ id: 'd', remaining_amount: 800_000, due_date: '2026-11-30' })
        const plan = payoffPlan([d], pace, TODAY, { d: 100_000 })
        expect(plan.stops[0]).toMatchObject({ thisPeriodDue: 200_000, doneThisPeriod: false })
        expect(plan.thisPeriod).toBe(200_000)
        expect(payoffSchedule(plan.stops[0]).map(s => s.amount)).toEqual([200_000, 300_000, 300_000])
    })

    it('counts the plan’s whole remaining amount first, for the wish roadmap to start after', () => {
        const plan = payoffPlan([debt({ remaining_amount: 500_000 }), debt({ remaining_amount: 250_000 }), debt({ type: 'receivable' })], pace, TODAY)
        expect(plan.owed).toBe(750_000)
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

describe('fasterPayoff', () => {
    it('says what a period sooner takes on top of the leftover', () => {
        // 4.5m at 50k a day: 90 days. A period sooner is 60 days: 75k a day, 25k more, 750k a period.
        const faster = fasterPayoff([debt({ remaining_amount: 4_500_000 })], pace, TODAY)
        expect(faster).toEqual({ current: '2026-12-30', sooner: '2026-11-30', extraPerPeriod: 750_000 })
    })

    it('stays quiet without a pace, or when the end is under two periods away', () => {
        expect(fasterPayoff([debt({ remaining_amount: 4_500_000 })], null, TODAY)).toBeNull()
        expect(fasterPayoff([debt({ remaining_amount: 1_000_000 })], pace, TODAY)).toBeNull()
        expect(fasterPayoff([debt({ type: 'receivable', remaining_amount: 4_500_000 })], pace, TODAY)).toBeNull()
    })
})

describe('payoffSchedule', () => {
    it('splits evenly in round steps, the last taking what is left', () => {
        const steps = payoffSchedule({ debt: debt({ remaining_amount: 1_000_000 }), periodsLeft: 3 })
        expect(steps).toEqual([
            { label: 'This period', amount: 334_000, last: false, done: false },
            { label: 'Next period', amount: 333_000, last: false, done: false },
            { label: 'Period 3', amount: 333_000, last: true, done: false },
        ])
    })

    it('matches the plan’s amount for this period', () => {
        const [stop] = payoffPlan([debt({ remaining_amount: 1_000_000, due_date: '2026-11-30' })], pace, TODAY).stops
        expect(stop.thisPeriodDue).toBe(payoffSchedule(stop)[0].amount)
    })

    it('is empty without a due date', () => {
        expect(payoffSchedule({ debt: debt(), periodsLeft: null })).toEqual([])
    })
})
