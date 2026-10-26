import { describe, expect, it } from 'vitest'
import { affordVerdict, aroundLabel, readyAround, type AffordInput } from './afford'

const TODAY = '2026-10-19'
const pace = { perPeriod: 1_500_000, periodDays: 30, perDay: 50_000, basedOn: 3 }
const base: AffordInput = { amount: 300_000, safeToSpend: 1_000_000, daysLeft: 6, usualPerDay: 80_000, pace, payday: '2026-10-25', today: TODAY }

describe('affordVerdict', () => {
    it('says yes when the days after still cover the usual pace', () => {
        // 700k over 6 days is ~117k a day, above the usual 80k.
        expect(affordVerdict(base)).toMatchObject({ kind: 'yes', daysLeft: 6 })
    })

    it('calls it tight when it leaves less a day than is usually spent', () => {
        expect(affordVerdict({ ...base, amount: 700_000 })).toMatchObject({ kind: 'tight', perDayAfter: 50_000, usualPerDay: 80_000 })
    })

    it('waits for payday when one usual leftover covers it', () => {
        expect(affordVerdict({ ...base, amount: 1_200_000 })).toMatchObject({ kind: 'after-payday', short: 200_000, payday: '2026-10-25' })
    })

    it('says save for it when it is more than a period leaves over', () => {
        // 3m at 50k a day: 60 days.
        expect(affordVerdict({ ...base, amount: 3_000_000 })).toEqual({ kind: 'save', short: 2_000_000, readyAround: '2026-12-18' })
    })

    it('cannot tell without an open period, and has no date without a pace', () => {
        expect(affordVerdict({ ...base, safeToSpend: null })).toEqual({ kind: 'unknown' })
        expect(affordVerdict({ ...base, amount: 3_000_000, pace: null })).toEqual({ kind: 'save', short: 2_000_000, readyAround: null })
    })

    it('does not call it tight before the pace is known', () => {
        expect(affordVerdict({ ...base, amount: 900_000, usualPerDay: null }).kind).toBe('yes')
    })
})

describe('readyAround / aroundLabel', () => {
    it('dates and words a save-up', () => {
        expect(readyAround(1_000_000, pace, TODAY)).toBe('2026-11-08')
        expect(aroundLabel('2026-12-08', TODAY)).toBe('early-December')
        expect(aroundLabel('2026-12-15', TODAY)).toBe('mid-December')
        expect(aroundLabel('2027-03-28', TODAY)).toBe('late-March 2027')
        expect(readyAround(1_000_000, { ...pace, perDay: 0 }, TODAY)).toBeNull()
    })
})
