import { describe, expect, it } from 'vitest'
import { period } from '@/test/fixtures'
import { addDaysISO, paydayLabel, periodDayLabel, periodMonth, periodProgress, periodRange } from './period-progress'

const prev = period({ id: 'prev', status: 'closed', start_date: '2026-08-25', end_date: '2026-09-24' })

describe('periodProgress', () => {
    it('reads an open period against the previous one’s length', () => {
        // 25 Sep – 24 Oct is 30 days; 19 Oct is day 25 and payday is 25 Oct.
        const active = period({ start_date: '2026-09-25' })
        const prev30 = period({ id: 'p30', status: 'closed', start_date: '2026-08-26', end_date: '2026-09-24' })
        const p = periodProgress(active, [active, prev30], '2026-10-19')
        expect(p).toMatchObject({ day: 25, totalDays: 30, estimated: true, pastUsualLength: false, endDate: '2026-10-24', daysToPayday: 6 })
        expect(p.fraction).toBeCloseTo(25 / 30)
        expect(paydayLabel(p)).toBe('payday in about 6 days')
        expect(periodDayLabel(p)).toBe('Day 25 of about 30')
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
        expect(p.pastUsualLength).toBe(true)
        expect(paydayLabel(p)).toBe('past your usual length')
        expect(periodDayLabel(p)).toBe(`Day ${p.day}`)
    })

    it('says tomorrow on the last day, hedged only when estimated', () => {
        const active = period({ start_date: '2026-09-25' })
        // The previous period ran 31 days, so 25 Oct is the estimated last day.
        expect(paydayLabel(periodProgress(active, [active, prev], '2026-10-25'))).toBe('payday likely tomorrow')
        const fixed = period({ start_date: '2026-09-25', end_date: '2026-10-24' })
        const p = periodProgress(fixed, [fixed], '2026-10-24')
        expect(paydayLabel(p)).toBe('payday tomorrow')
        expect(periodDayLabel(p)).toBe('Day 30 of 30')
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
        expect(periodMonth('2026-09-25', '2026-10-24')).toBe('September')
        expect(periodMonth('2026-08-25', '2026-09-24', true)).toBe('Aug 2026')
        expect(periodMonth('2026-10-10', null)).toBe('October')
        expect(periodRange('2026-09-25', '2026-10-24')).toBe('25 Sep – 24 Oct')
        expect(periodRange('2026-09-25', null)).toBe('From 25 Sep')
        expect(periodRange('2026-09-25', '2026-10-24', true)).toBe('25 Sep – about 24 Oct')
    })
})
