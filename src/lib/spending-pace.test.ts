import { describe, expect, it } from 'vitest'
import { isEverydaySpending, isOneOff } from './spending-pace'

const INCOME = 10_000_000

describe('isOneOff', () => {
    it('flags bill-like categories in English and Indonesian', () => {
        for (const name of ['Rent', 'Utilities', 'Internet', 'Debt Payment', 'Sewa Kos', 'Tagihan Listrik', 'Cicilan Motor', 'Utang']) {
            expect(isOneOff({ type: 'expense', amount: 1, category: { name } }, INCOME), name).toBe(true)
        }
    })

    it('flags a single expense of at least 10% of income', () => {
        expect(isOneOff({ type: 'expense', amount: 1_000_000, category: { name: 'Food' } }, INCOME)).toBe(true)
        expect(isOneOff({ type: 'expense', amount: 999_999, category: { name: 'Food' } }, INCOME)).toBe(false)
    })

    it('has no size rule without income', () => {
        expect(isOneOff({ type: 'expense', amount: 50_000_000 }, 0)).toBe(false)
    })

    it('never flags income', () => {
        expect(isOneOff({ type: 'income', amount: 1, category: { name: 'Rent' } }, INCOME)).toBe(false)
    })

    it('matches on word starts, not inside words', () => {
        // "Parent gift" contains "rent" but isn't rent.
        expect(isOneOff({ type: 'expense', amount: 1, category: { name: 'Parent gift' } }, INCOME)).toBe(false)
    })
})

describe('isEverydaySpending', () => {
    it('keeps small, ordinary expenses', () => {
        expect(isEverydaySpending({ type: 'expense', amount: 25_000, category: { name: 'Coffee' } }, INCOME)).toBe(true)
    })

    it('drops savings, one-offs and income', () => {
        expect(isEverydaySpending({ type: 'expense', amount: 25_000, category: { name: 'Tabungan', is_savings: true } }, INCOME)).toBe(false)
        expect(isEverydaySpending({ type: 'expense', amount: 25_000, category: { name: 'Rent' } }, INCOME)).toBe(false)
        expect(isEverydaySpending({ type: 'income', amount: 25_000 }, INCOME)).toBe(false)
    })
})
