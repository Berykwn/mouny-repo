import { describe, expect, it } from 'vitest'
import { period } from '@/test/fixtures'
import { addDaysISO, periodMonth, periodProgress, periodRange } from './period-progress'

const prev = period({ id: 'prev', status: 'closed', start_date: '2026-08-25', end_date: '2026-09-24' })

describe('periodProgress', () => {
    it('reads an open period against the previous one’s length', () => {
        // 25 Sep – 24 Oct is 30 days; 19 Oct is day 25 and payday is 25 Oct.
        const active = period({ start_date: '2026-09-25' })
        const prev30 = period({ id: 'p30', status: 'closed', start_date: '2026-08-26', end_date: '2026-09-24' })
        const p = periodProgress(active, [active, prev30], '2026-10-19')
        expect(p).toMatchObject({ day: 25, totalDays: 30, estimated: true, endDate: '2026-10-24', daysToPayday: 6 })
        expect(p.fraction).toBeCloseTo(25 / 30)
    })

    it('leaves the length unknown without an earlier period', () => {
        const active = period({ start_date: '2026-09-25' })
        expect(periodProgress(active, [active], '2026-10-01')).toMatchObject({ day: 7, totalDays: null, daysToPayday: null, fraction: null })
    })

    it('never ends an overrunning period in the past', () => {
        const active = period({ start_date: '2026-09-25' })
        const p = periodProgress(active, [active, prev], '2026-11-01')
        expect(p.totalDays).toBe(p.day)
        expect(p.daysToPayday).toBe(1)
    })

    it('counts a closed period as finished', () => {
        expect(periodProgress(prev, [prev], '2026-10-19')).toMatchObject({ day: 31, totalDays: 31, fraction: 1, daysToPayday: 0 })
    })
})

describe('period labels', () => {
    it('moves dates across month ends', () => {
        expect(addDaysISO('2026-09-25', 29)).toBe('2026-10-24')
    })

    it('names a period by the month it ends in', () => {
        expect(periodMonth('2026-09-25', '2026-10-24')).toBe('October')
        expect(periodMonth('2026-08-25', '2026-09-24', true)).toBe('Sep 2026')
        expect(periodRange('2026-09-25', '2026-10-24')).toBe('25 Sep – 24 Oct')
        expect(periodRange('2026-09-25', null)).toBe('From 25 Sep')
    })
})
