import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { period } from '@/test/fixtures'
import { nextWindow } from '@/features/plan/lib/upcoming'
import { periodWindow } from '@/features/bills/lib/bills'
import { paydayDue, paydaySnoozed, snoozePayday } from './payday'

// The walkthrough's account: September ran 10 Sep – 9 Oct, October opened on 10 Oct.
const september = period({ id: 'sep', status: 'closed', start_date: '2026-09-10', end_date: '2026-10-09' })
const october = period({ id: 'oct', start_date: '2026-10-10' })
const periods = [october, september]

describe('paydayDue', () => {
    it('stays quiet before payday', () => {
        expect(paydayDue(october, periods, '2026-10-20')).toBeNull()
        // The last day of the usual length is still October's.
        expect(paydayDue(october, periods, '2026-11-08')).toBeNull()
    })

    it('asks on payday itself, the day Plan says the next period starts', () => {
        const due = paydayDue(october, periods, '2026-11-09')
        expect(due).toEqual({ current: 'October', next: 'November', expected: '2026-11-09', daysLate: 0 })
        const plan = nextWindow(periodWindow(october, periods))
        expect(due?.expected).toBe(plan.start)
    })

    it('keeps asking, counting the days, once payday has passed', () => {
        expect(paydayDue(october, periods, '2026-11-12')).toMatchObject({ next: 'November', daysLate: 3 })
    })

    it('reads the period before whatever order the list comes in', () => {
        expect(paydayDue(october, [september, october], '2026-11-09')?.expected).toBe('2026-11-09')
    })

    it('uses a month for the very first period', () => {
        const first = period({ id: 'first', start_date: '2026-10-10' })
        expect(paydayDue(first, [first], '2026-11-09')).toBeNull()
        expect(paydayDue(first, [first], '2026-11-10')).toMatchObject({ expected: '2026-11-10', daysLate: 0 })
    })

    it('goes by a fixed end date when the period has one', () => {
        const fixed = period({ id: 'fixed', start_date: '2026-10-10', end_date: '2026-11-04' })
        expect(paydayDue(fixed, [fixed, september], '2026-11-04')).toBeNull()
        expect(paydayDue(fixed, [fixed, september], '2026-11-05')).toMatchObject({ expected: '2026-11-05' })
    })

    it('never asks for a closed period or none', () => {
        expect(paydayDue(september, periods, '2026-12-01')).toBeNull()
        expect(paydayDue(null, periods, '2026-12-01')).toBeNull()
    })

    it('names the next period after the month it would start in', () => {
        // Payday was due 30 Dec; on 2 Jan the period that would open is January (this year by then).
        const dec = period({ id: 'dec', start_date: '2026-11-30' })
        const nov = period({ id: 'nov', status: 'closed', start_date: '2026-10-31', end_date: '2026-11-29' })
        expect(paydayDue(dec, [dec, nov], '2027-01-02')).toMatchObject({ current: 'November 2026', next: 'January', expected: '2026-12-30' })
    })
})

describe('Not paid yet', () => {
    // Tests run in Node: a Map stands in for the browser's storage.
    beforeEach(() => {
        const store = new Map<string, string>()
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => { store.set(k, v) },
        })
    })
    afterEach(() => vi.unstubAllGlobals())

    it('shows the prompt again when storage is blocked', () => {
        vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
        expect(() => snoozePayday('oct', '2026-11-09')).not.toThrow()
        expect(paydaySnoozed('oct', '2026-11-09')).toBe(false)
    })

    it('puts the prompt off for the rest of the day, for that period only', () => {
        expect(paydaySnoozed('oct', '2026-11-09')).toBe(false)
        snoozePayday('oct', '2026-11-09')
        expect(paydaySnoozed('oct', '2026-11-09')).toBe(true)
        expect(paydaySnoozed('oct', '2026-11-10')).toBe(false)
        expect(paydaySnoozed('nov', '2026-11-09')).toBe(false)
    })

    it('shrugs off a broken stored value', () => {
        localStorage.setItem('mouny-payday-snooze', '{not json')
        expect(paydaySnoozed('oct', '2026-11-09')).toBe(false)
    })
})
