import { describe, expect, it } from 'vitest'
import { addDays, monthLabel, monthYearLabel } from './dates'

describe('dates', () => {
    it('adds days across months and years', () => {
        expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
        expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    })

    it('labels months', () => {
        expect(monthYearLabel('2026-10-27')).toBe('Oct 2026')
        expect(monthLabel('2026-12-05', '2026-10-27')).toBe('December')
        expect(monthLabel('2027-02-05', '2026-10-27')).toBe('February 2027')
    })
})
