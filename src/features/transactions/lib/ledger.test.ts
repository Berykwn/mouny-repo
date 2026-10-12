import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import type { BillDue } from '@/features/bills/lib/bills'
import {
    applyFilter, categoryFacets, dailyAllowance, dailyEverydaySpending, dailySpending, groupByDate, isOverAllowance,
    linkedTo, txTitle, unpaidBillsFor,
} from './ledger'

describe('linkedTo', () => {
    it('recognises transfer, wish and debt transactions', () => {
        expect(linkedTo(tx({ type: 'transfer_out', transfer_id: 't1' }))).toBe('transfer')
        expect(linkedTo(tx({ wish_list_item_id: 'w1' }))).toBe('wish')
        expect(linkedTo(tx({ debt_id: 'd1' }))).toBe('debt')
        expect(linkedTo(tx({ type: 'transfer_in', debt_id: 'd1', note: 'Collected from — Andi' }))).toBe('debt')
        expect(linkedTo(tx({ type: 'transfer_in', note: 'Balance adjustment' }))).toBeNull()
        expect(linkedTo(tx({ note: 'Lunch', category: { name: 'Food' } }))).toBeNull()
    })

    it('still recognises debt rows written before debt_id existed', () => {
        expect(linkedTo(tx({ category: { name: 'Debt Payment' } }))).toBe('debt')
        expect(linkedTo(tx({ note: 'Lent to — Andi' }))).toBe('debt')
    })
})

describe('txTitle', () => {
    it('falls back from note to category to type', () => {
        expect(txTitle(tx({ note: 'Kopi', category: { name: 'Food' } }))).toBe('Kopi')
        expect(txTitle(tx({ category: { name: 'Food' } }))).toBe('Food')
        expect(txTitle(tx({ type: 'income' }))).toBe('Income')
        expect(txTitle(tx({ type: 'transfer_in' }))).toBe('Transfer')
    })
})

describe('groupByDate', () => {
    it('groups newest day first with day totals, latest entry first', () => {
        const groups = groupByDate([
            tx({ id: 'old', date: '2026-09-14', amount: 5_000 }),
            tx({ id: 'early', date: '2026-09-15', amount: 10_000, created_at: '2026-09-15T01:00:00Z' }),
            tx({ id: 'late', date: '2026-09-15', amount: 20_000, created_at: '2026-09-15T09:00:00Z' }),
            tx({ id: 'pay', date: '2026-09-15', type: 'income', amount: 100_000 }),
            tx({ id: 'xfer', date: '2026-09-15', type: 'transfer_out', amount: 500_000 }),
            tx({ id: 'saved', date: '2026-09-15', amount: 2_000_000, category: { is_savings: true } }),
        ])
        expect(groups.map(g => g.date)).toEqual(['2026-09-15', '2026-09-14'])
        // Savings aren't spending, as in the hero's "Spent".
        expect(groups[0]).toMatchObject({ income: 100_000, spending: 30_000, savings: 2_000_000 })
        expect(groups[0].txs.map(t => t.id).indexOf('late')).toBeLessThan(groups[0].txs.map(t => t.id).indexOf('early'))
    })
})

describe('applyFilter', () => {
    const txs = [
        tx({ id: 'coffee', note: 'Kopi susu', amount: 25_000, category: { id: 'food', name: 'Food' } }),
        tx({ id: 'salary', type: 'income', amount: 10_000_000, note: 'Gaji' }),
        tx({ id: 'loose', amount: 7_000 }),
    ]
    const ids = (f: Parameters<typeof applyFilter>[1]) => applyFilter(txs, f).map(t => t.id)

    it('filters by type, category and uncategorised', () => {
        expect(ids({ query: '', type: 'income', categoryId: null })).toEqual(['salary'])
        expect(ids({ query: '', type: 'all', categoryId: 'food' })).toEqual(['coffee'])
        expect(ids({ query: '', type: 'all', categoryId: 'none' })).toEqual(['salary', 'loose'])
    })

    it('searches note, category, account and amount, case-insensitively', () => {
        expect(ids({ query: '  KOPI ', type: 'all', categoryId: null })).toEqual(['coffee'])
        expect(ids({ query: 'food', type: 'all', categoryId: null })).toEqual(['coffee'])
        expect(ids({ query: 'bca', type: 'all', categoryId: null })).toHaveLength(3)
        expect(ids({ query: '7000', type: 'all', categoryId: null })).toEqual(['loose'])
    })

    it('matches an amount typed the way it is shown', () => {
        expect(ids({ query: '25.000', type: 'all', categoryId: null })).toEqual(['coffee'])
        expect(ids({ query: 'Rp 10.000.000', type: 'all', categoryId: null })).toEqual(['salary'])
    })
})

describe('categoryFacets', () => {
    it('counts and totals per category, biggest first', () => {
        const facets = categoryFacets([
            tx({ amount: 10, category: { id: 'a', name: 'A' } }),
            tx({ amount: 15, category: { id: 'a', name: 'A' } }),
            tx({ amount: 100, category: { id: 'b', name: 'B' } }),
            tx({ amount: 999 }),
        ])
        expect(facets).toEqual([
            { id: 'b', name: 'B', count: 1, total: 100 },
            { id: 'a', name: 'A', count: 2, total: 25 },
        ])
    })
})

describe('dailySpending', () => {
    it('sums expenses per day, leaving out savings and income', () => {
        const map = dailySpending([
            tx({ date: '2026-09-15', amount: 10_000 }),
            tx({ date: '2026-09-15', amount: 5_000, category: { is_savings: true } }),
            tx({ date: '2026-09-15', type: 'income', amount: 1_000_000 }),
            tx({ date: '2026-09-16', amount: 3_000 }),
        ])
        expect(Object.fromEntries(map)).toEqual({ '2026-09-15': 10_000, '2026-09-16': 3_000 })
    })

    it('leaves bills and big one-offs out of the everyday part', () => {
        const map = dailyEverydaySpending([
            tx({ date: '2026-09-15', amount: 10_000 }),
            tx({ date: '2026-09-15', amount: 3_000_000, category: { kind: 'fixed' } }),
            tx({ date: '2026-09-16', amount: 2_000_000 }),
        ], 10_000_000)
        expect(Object.fromEntries(map)).toEqual({ '2026-09-15': 10_000 })
    })
})

describe('unpaidBillsFor', () => {
    const due = (id: string, category_id: string | null, outstanding: number) =>
        ({ bill: { id, category_id }, outstanding }) as unknown as BillDue
    const dues = [due('rent', 'housing', 1), due('wifi', 'housing', 0), due('gym', 'health', 1), due('loose', null, 1)]

    it('offers only bills still due in that category', () => {
        expect(unpaidBillsFor(dues, 'housing').map(d => d.bill.id)).toEqual(['rent'])
        expect(unpaidBillsFor(dues, 'food')).toEqual([])
        expect(unpaidBillsFor(dues, null)).toEqual([])
    })
})

describe('dailyAllowance', () => {
    const stats = { isClosed: false, safeDaily: 150_000, totalIncome: 10_000_000, totalSavings: 1_000_000, oneOffSpending: 3_000_000, totalDays: 30 }

    it('is the hero’s safe daily amount for an open period, never below zero', () => {
        expect(dailyAllowance(stats)).toEqual({ amount: 150_000, kind: 'safe' })
        expect(dailyAllowance({ ...stats, safeDaily: -20_000 })).toEqual({ amount: 0, kind: 'safe' })
    })

    it('spreads a closed period’s everyday money evenly', () => {
        expect(dailyAllowance({ ...stats, isClosed: true, safeDaily: null })).toEqual({ amount: 200_000, kind: 'share' })
    })

    it('is null with no income to share', () => {
        expect(dailyAllowance({ ...stats, totalIncome: 0 })).toBeNull()
    })

    it('marks any everyday spending once there is no room left', () => {
        expect(isOverAllowance(1, { amount: 0, kind: 'safe' })).toBe(true)
        expect(isOverAllowance(0, { amount: 0, kind: 'safe' })).toBe(false)
        expect(isOverAllowance(100, { amount: 150, kind: 'safe' })).toBe(false)
        expect(isOverAllowance(100, null)).toBe(false)
    })
})
