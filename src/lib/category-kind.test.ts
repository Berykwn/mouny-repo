import { describe, expect, it } from 'vitest'
import { guessCategoryKind, resolveCategoryKind } from './category-kind'

describe('guessCategoryKind', () => {
    it('guesses bills, lifestyle and savings from the name', () => {
        expect(guessCategoryKind('Sewa Kos')).toBe('fixed')
        expect(guessCategoryKind('Subscriptions')).toBe('fixed')
        expect(guessCategoryKind('Shopping')).toBe('lifestyle')
        expect(guessCategoryKind('Hiburan')).toBe('lifestyle')
        expect(guessCategoryKind('Food & Drinks')).toBe('daily')
        expect(guessCategoryKind('Anything', true)).toBe('savings')
    })
})

describe('resolveCategoryKind', () => {
    it('uses the stored kind when there is one', () => {
        expect(resolveCategoryKind({ name: 'Rent', kind: 'daily' })).toBe('daily')
    })

    it('falls back to a guess for rows without a kind', () => {
        expect(resolveCategoryKind({ name: 'Rent', kind: null })).toBe('fixed')
        expect(resolveCategoryKind({ name: 'Tabungan', is_savings: true })).toBe('savings')
    })

    it('counts uncategorized spending as everyday', () => {
        expect(resolveCategoryKind(null)).toBe('daily')
    })
})
