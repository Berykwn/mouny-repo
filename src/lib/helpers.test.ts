import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    daysUntil,
    formatCompact,
    formatCurrencyInput,
    formatShortCurrency,
    getDaysBetween,
    getInitials,
    parseCurrencyInput,
    parseCurrencyWithSign,
    parseDecimalInput,
    spentPercent,
    toDecimalInput,
    toISODate,
    toSignedDigits,
} from './helpers'

describe('signed currency input', () => {
    it('keeps a minus typed first, last or before the number', () => {
        expect(toSignedDigits('-')).toBe('-')
        expect(toSignedDigits('-5')).toBe('-5')
        expect(toSignedDigits('-5.000')).toBe('-5000')
        expect(toSignedDigits('5.000-')).toBe('-5000')
        expect(toSignedDigits('5.000')).toBe('5000')
    })

    it('reads the minus signs phone keyboards type', () => {
        expect(toSignedDigits('−5000')).toBe('-5000')
        expect(toSignedDigits('–5000')).toBe('-5000')
        expect(formatCurrencyInput('−25000')).toBe('-25.000')
    })

    it('parses whole signed rupiah', () => {
        expect(parseCurrencyWithSign('-20.000')).toBe(-20_000)
        expect(parseCurrencyWithSign('50.000')).toBe(50_000)
        expect(parseCurrencyWithSign('-')).toBe(0)
        expect(parseCurrencyWithSign('')).toBe(0)
    })
})

describe('decimal input', () => {
    it('reads a comma as the decimal separator', () => {
        expect(toDecimalInput('0,5')).toBe('0.5')
        expect(parseDecimalInput('0,5')).toBe(0.5)
        expect(parseDecimalInput('2,5')).toBe(2.5)
    })

    it('keeps only the first separator', () => {
        expect(toDecimalInput('1.2.3')).toBe('1.23')
        expect(toDecimalInput('1,2,3')).toBe('1.23')
        expect(parseDecimalInput('abc')).toBe(0)
    })
})

describe('currency input', () => {
    it('formats digits with Indonesian grouping and keeps a leading minus', () => {
        expect(formatCurrencyInput('1500000')).toBe('1.500.000')
        expect(formatCurrencyInput('-25000')).toBe('-25.000')
        expect(formatCurrencyInput('-')).toBe('-')
        expect(formatCurrencyInput('abc')).toBe('')
        expect(formatCurrencyInput('')).toBe('')
    })

    it('parses formatted input back to a whole number', () => {
        expect(parseCurrencyInput('1.500.000')).toBe(1_500_000)
        expect(parseCurrencyInput('Rp 25.000')).toBe(25_000)
        expect(parseCurrencyInput('')).toBe(0)
        expect(parseCurrencyInput('abc')).toBe(0)
    })
})

describe('dates (in WIB)', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('toISODate uses the local day, not UTC', () => {
        // 00:30 WIB on Oct 1 is still Sep 30 in UTC.
        vi.setSystemTime(new Date('2026-09-30T17:30:00Z'))
        expect(toISODate()).toBe('2026-10-01')
    })

    it('daysUntil counts local calendar days', () => {
        vi.setSystemTime(new Date('2026-09-30T17:30:00Z')) // Oct 1, 00:30 WIB
        expect(daysUntil('2026-10-01')).toBe(0)
        expect(daysUntil('2026-10-08')).toBe(7)
        expect(daysUntil('2026-09-28')).toBe(-3)
    })

    it('getDaysBetween ignores time and zone, and tolerates bad input', () => {
        expect(getDaysBetween('2026-09-25', '2026-10-25')).toBe(30)
        expect(getDaysBetween('2026-09-25T23:59:00Z', '2026-09-26')).toBe(1)
        expect(getDaysBetween(undefined, '2026-09-26')).toBe(0)
        expect(getDaysBetween('garbage', '2026-09-26')).toBe(0)
    })
})

describe('formatting', () => {
    it('shortens amounts', () => {
        expect(formatCompact(1_500_000)).toBe('1.5m')
        expect(formatCompact(2_000_000)).toBe('2m')
        expect(formatCompact(12_400)).toBe('12k')
        expect(formatShortCurrency(1_500_000)).toBe('1.5jt')
        expect(formatShortCurrency(25_000)).toBe('25rb')
        expect(formatShortCurrency(-1_500_000)).toBe('-1.5jt')
        expect(formatCompact(-12_400)).toBe('-12k')
    })

    it('spentPercent is 0 with no budget', () => {
        expect(spentPercent(500, 0)).toBe(0)
        expect(spentPercent(50, 200)).toBe(25)
    })

    it('getInitials prefers the full name, then the email', () => {
        expect(getInitials({ user_metadata: { full_name: '  budi  santoso putra ' } })).toBe('BS')
        expect(getInitials({ email: 'someone@example.com' })).toBe('S')
        expect(getInitials(null)).toBe('?')
    })
})
