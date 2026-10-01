import { describe, expect, it } from 'vitest'
import { period, wish } from '@/test/fixtures'
import { EMPTY_PERIOD_SUMMARY } from '@/lib/period-summary'
import { buildRoadmap, pacePeriods, savingsPace, sortWishes, targetPlan, wishProgress } from './wish-analytics'

const TODAY = '2026-10-01'
const pace = { perPeriod: 1_500_000, periodDays: 30, perDay: 50_000, basedOn: 3 }

describe('wishProgress', () => {
    it('tracks a priced goal', () => {
        expect(wishProgress(wish({ estimated_price: 1_000_000, saved_amount: 250_000 })))
            .toEqual({ target: 1_000_000, saved: 250_000, remaining: 750_000, percent: 25, ready: false })
        expect(wishProgress(wish({ estimated_price: 1_000_000, saved_amount: 1_200_000 })))
            .toMatchObject({ remaining: 0, percent: 100, ready: true })
    })

    it('has no target without a price', () => {
        expect(wishProgress(wish({ saved_amount: 50_000 }))).toMatchObject({ target: null, remaining: null, percent: 0, ready: false })
    })

    it('tracks a quantity goal by units, rounding to whole rupiah', () => {
        const p = wishProgress(wish({ quantity: 10, saved_quantity: 2.5, price_per_unit: 1_000_001, saved_amount: 2_500_000 }))
        expect(p.target).toBe(10_000_010)
        expect(p.remaining).toBe(7_500_008)
        expect(p.percent).toBe(25)
        expect(wishProgress(wish({ quantity: 10, saved_quantity: 10, price_per_unit: 1 })).ready).toBe(true)
    })
})

describe('sortWishes', () => {
    it('orders by priority, then closest to done', () => {
        const ids = sortWishes([
            wish({ id: 'low', priority: 'low', estimated_price: 10 }),
            wish({ id: 'high-far', priority: 'high', estimated_price: 1_000 }),
            wish({ id: 'high-near', priority: 'high', estimated_price: 100 }),
            wish({ id: 'high-unpriced', priority: 'high' }),
        ]).map(w => w.id)
        expect(ids).toEqual(['high-near', 'high-far', 'high-unpriced', 'low'])
    })
})

describe('savingsPace / pacePeriods', () => {
    it('averages leftover over closed periods only', () => {
        const a = period({ id: 'a', status: 'closed', start_date: '2026-07-25', end_date: '2026-08-23' }) // 30 days
        const b = period({ id: 'b', status: 'closed', start_date: '2026-08-24', end_date: '2026-09-22' }) // 30 days
        const open = period({ id: 'open', status: 'active', start_date: '2026-09-23' })
        const summaries = {
            a: { ...EMPTY_PERIOD_SUMMARY, unspent: 1_000_000 },
            b: { ...EMPTY_PERIOD_SUMMARY, unspent: 2_000_000 },
            open: { ...EMPTY_PERIOD_SUMMARY, unspent: 9_000_000 },
        }
        expect(savingsPace([a, b, open], summaries)).toEqual({ perPeriod: 1_500_000, periodDays: 30, perDay: 50_000, basedOn: 2 })
        expect(savingsPace([open], summaries)).toBeNull()
    })

    it('pacePeriods takes the latest three closed periods', () => {
        const closed = ['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01'].map(start_date =>
            period({ id: start_date, status: 'closed', start_date, end_date: start_date }))
        expect(pacePeriods([...closed, period()]).map(p => p.id)).toEqual(['2026-08-01', '2026-07-01', '2026-06-01'])
    })
})

describe('buildRoadmap', () => {
    it('funds goals one at a time and skips unpriced ones', () => {
        const stops = buildRoadmap([
            wish({ id: 'first', priority: 'high', estimated_price: 500_000 }),
            wish({ id: 'second', priority: 'low', estimated_price: 1_000_000 }),
            wish({ id: 'unpriced' }),
            wish({ id: 'ready', priority: 'high', estimated_price: 10, saved_amount: 10 }),
        ], pace, TODAY)
        expect(stops.map(s => [s.item.id, s.date, s.periods])).toEqual([
            ['ready', TODAY, 0],
            ['first', '2026-10-11', 1],
            ['second', '2026-10-31', 1],
        ])
    })

    it('has no dates without a positive pace', () => {
        expect(buildRoadmap([wish({ estimated_price: 100 })], null, TODAY)[0]).toMatchObject({ date: null, periods: null })
    })
})

describe('targetPlan', () => {
    it('is on track when the roadmap reaches it by the date', () => {
        const item = wish({ estimated_price: 600_000, target_date: '2026-11-30' })
        const [stop] = buildRoadmap([item], pace, TODAY)
        expect(targetPlan(item, stop, pace, TODAY)).toEqual({
            targetDate: '2026-11-30', status: 'on-track', daysLeft: 60, periodsLeft: 3, perPeriodNeeded: 200_000,
        })
    })

    it('reports overdue, done and undated', () => {
        expect(targetPlan(wish({ estimated_price: 100, target_date: '2026-09-01' }), undefined, pace, TODAY)?.status).toBe('overdue')
        expect(targetPlan(wish({ estimated_price: 100, saved_amount: 100, target_date: '2026-12-01' }), undefined, pace, TODAY))
            .toMatchObject({ status: 'done', perPeriodNeeded: 0 })
        expect(targetPlan(wish({ estimated_price: 100 }), undefined, pace, TODAY)).toBeNull()
    })
})
