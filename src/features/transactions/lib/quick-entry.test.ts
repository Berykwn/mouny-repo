import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import { frequentEntries, parseQuickEntry, parseShortAmount } from './quick-entry'

describe('parseShortAmount', () => {
    it('reads rupiah shorthand', () => {
        expect(parseShortAmount('35rb')).toBe(35_000)
        expect(parseShortAmount('35k')).toBe(35_000)
        expect(parseShortAmount('35RIBU')).toBe(35_000)
        expect(parseShortAmount('1,5jt')).toBe(1_500_000)
        expect(parseShortAmount('1.5jt')).toBe(1_500_000)
        expect(parseShortAmount('2juta')).toBe(2_000_000)
        expect(parseShortAmount('Rp25.000')).toBe(25_000)
    })

    it('reads separators as thousands without a unit', () => {
        expect(parseShortAmount('35.000')).toBe(35_000)
        expect(parseShortAmount('1.250.000')).toBe(1_250_000)
        expect(parseShortAmount('35000')).toBe(35_000)
    })

    it('takes the unit from the next word', () => {
        expect(parseShortAmount('35', 'rb')).toBe(35_000)
        expect(parseShortAmount('1,5', 'juta')).toBe(1_500_000)
        expect(parseShortAmount('35', 'kopi')).toBe(35)
    })

    it('ignores words that are not amounts', () => {
        expect(parseShortAmount('kopi')).toBeNull()
        expect(parseShortAmount('rb')).toBeNull()
        expect(parseShortAmount('0')).toBeNull()
    })
})

const accounts = [
    { id: 'bca', name: 'BCA' },
    { id: 'bca-syariah', name: 'BCA Syariah' },
    { id: 'gopay', name: 'GoPay Wallet' },
    { id: 'cash', name: 'Cash' },
]
const categories = [
    { id: 'food', name: 'Food & Drinks', type: 'expense' as const },
    { id: 'transport', name: 'Transportation', type: 'expense' as const },
    { id: 'fuel', name: 'Fuel', type: 'expense' as const },
    { id: 'shopping', name: 'Shopping', type: 'expense' as const },
    { id: 'salary', name: 'Salary', type: 'income' as const },
]

describe('parseQuickEntry', () => {
    const parse = (text: string, history = [] as ReturnType<typeof tx>[]) =>
        parseQuickEntry(text, { accounts, categories, history })

    it('splits amount, account, category and note', () => {
        expect(parse('makan siang 35rb gopay')).toEqual({
            type: 'expense', amount: 35_000, accountId: 'gopay', categoryId: 'food', note: 'Makan siang',
        })
    })

    it('handles the amount anywhere and a unit as its own word', () => {
        expect(parse('35 rb bensin pakai cash')).toMatchObject({ amount: 35_000, accountId: 'cash', categoryId: 'fuel', note: 'Bensin' })
    })

    it('prefers the longest account name', () => {
        expect(parse('baju 200rb bca syariah')).toMatchObject({ accountId: 'bca-syariah', categoryId: 'shopping', note: 'Baju' })
    })

    it('reads income words', () => {
        expect(parse('gaji 8jt bca')).toMatchObject({ type: 'income', amount: 8_000_000, accountId: 'bca', categoryId: 'salary' })
    })

    it('learns categories from past notes before guessing', () => {
        const history = [
            tx({ note: 'Kopi kenangan', category: { id: 'shopping' } }),
            tx({ note: 'Kopi susu', category: { id: 'shopping' } }),
        ]
        expect(parse('kopi 25rb', history).categoryId).toBe('shopping')
        expect(parse('kopi 25rb').categoryId).toBe('food')
    })

    it('leaves what it cannot tell empty', () => {
        expect(parse('sesuatu')).toEqual({ type: 'expense', amount: null, accountId: null, categoryId: null, note: 'Sesuatu' })
    })
})

describe('frequentEntries', () => {
    it('ranks repeats by count and takes the latest amount', () => {
        const entries = frequentEntries([
            tx({ note: 'Kopi', amount: 20_000, date: '2026-09-01', category: { id: 'food' } }),
            tx({ note: 'kopi ', amount: 25_000, date: '2026-09-10', category: { id: 'food' } }),
            tx({ note: 'Kopi', amount: 22_000, date: '2026-09-05', category: { id: 'food' } }),
            tx({ note: 'Bensin', amount: 50_000, date: '2026-09-02', category: { id: 'fuel' } }),
            tx({ note: 'Bensin', amount: 50_000, date: '2026-09-09', category: { id: 'fuel' } }),
            tx({ note: 'Sekali', amount: 99_000, category: { id: 'food' } }),
        ])
        expect(entries.map(e => [e.label, e.amount, e.count])).toEqual([['kopi', 25_000, 3], ['Bensin', 50_000, 2]])
    })

    it('skips transfers and feature-made rows', () => {
        const entries = frequentEntries([
            tx({ type: 'transfer_out', transfer_id: 't1', note: 'Tabungan' }),
            tx({ type: 'transfer_out', transfer_id: 't2', note: 'Tabungan' }),
            tx({ debt_id: 'd1', note: 'Cicilan', category: { id: 'debt' } }),
            tx({ debt_id: 'd1', note: 'Cicilan', category: { id: 'debt' } }),
        ])
        expect(entries).toEqual([])
    })
})
