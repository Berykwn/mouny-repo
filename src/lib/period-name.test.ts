import { afterEach, describe, expect, it, vi } from 'vitest'
import { period } from '@/test/fixtures'
import { periodName, periodShortName } from './period-name'
import { formatPeriodLabel } from './helpers'

describe('periodName', () => {
    afterEach(() => vi.useRealTimers())

    it('names a period after the month it starts in (its payday)', () => {
        // 10 Oct – 8 Nov is the October period, whichever month most of it falls in.
        expect(periodName(period({ start_date: '2026-10-10', end_date: '2026-11-08' }), '2026-11-09')).toBe('October')
        expect(periodName(period({ start_date: '2026-09-25' }), '2026-10-19')).toBe('September')
        expect(periodShortName(period({ start_date: '2026-10-10' }), '2026-11-09')).toBe('Oct')
    })

    it('takes a bare start date, for a period not opened yet', () => {
        expect(periodName('2026-11-09', '2026-11-09')).toBe('November')
        expect(periodShortName('2026-11-09T08:00:00Z', '2026-11-09')).toBe('Nov')
    })

    it('adds the year only outside this one', () => {
        expect(periodName('2025-12-10', '2026-01-05')).toBe('December 2025')
        expect(periodShortName('2025-12-10', '2026-01-05')).toBe('Dec 2025')
        expect(periodName('2027-01-10', '2026-12-20')).toBe('January 2027')
    })

    it('reads English month names whatever the device’s language', () => {
        const names = ['2026-05-01', '2026-08-01', '2026-09-01', '2026-10-01'].map(d => periodShortName(d, '2026-11-09'))
        expect(names).toEqual(['May', 'Aug', 'Sep', 'Oct'])
    })

    it('defaults to the local date for "this year"', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-11-09T10:00:00'))
        expect(periodName('2026-10-10')).toBe('October')
        expect(periodName('2025-10-10')).toBe('October 2025')
    })

    it('gives charts the same short name', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-11-09T10:00:00'))
        expect(formatPeriodLabel('2026-10-10')).toBe('Oct')
        expect(formatPeriodLabel('2025-12-10')).toBe('Dec 2025')
        expect(formatPeriodLabel(null)).toBe('Period')
    })
})
