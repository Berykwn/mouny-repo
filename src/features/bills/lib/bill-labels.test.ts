import { describe, expect, it } from 'vitest'
import { setAsideText } from './bill-labels'

const insurance = { name: 'Insurance', amount: 2_400_000 }

describe('setAsideText', () => {
    it('names the bill, its month and what a month needs', () => {
        expect(setAsideText({ bill: insurance, date: '2027-03-15', monthsLeft: 5, perMonth: 480_000 }, '2026-10-27', true))
            .toBe('Insurance (Rp 2,4jt) is due in March 2027: putting aside Rp 480rb a month covers it.')
    })

    it('starts at the month on the bill’s own sheet, rounding the month up to a thousand', () => {
        expect(setAsideText({ bill: { name: 'Domain', amount: 200_000 }, date: '2026-12-01', monthsLeft: 3, perMonth: 200_000 / 3 }, '2026-10-27'))
            .toBe('Due in December: putting aside Rp 67rb a month covers it.')
    })

    it('asks for the whole amount when it is due within the month', () => {
        expect(setAsideText({ bill: insurance, date: '2026-11-02', monthsLeft: 1, perMonth: 2_400_000 }, '2026-10-27'))
            .toBe('Due in November: have the full Rp 2,4jt ready by then.')
    })
})
