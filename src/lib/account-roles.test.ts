import { describe, expect, it } from 'vitest'
import type { Account } from '@/types'
import { availableToSpend, balanceBreakdown, defaultAccount, groupByRole, owedOn, pickerOrder, roleOf } from './account-roles'

const acc = (over: Partial<Account> & { name: string }): Account => ({
    id: over.name.toLowerCase(),
    user_id: 'u',
    type: 'bank',
    role: 'everyday',
    position: 0,
    balance: 0,
    initial_balance: 0,
    credit_limit: null,
    is_savings: false,
    archived_at: null,
    created_at: null,
    ...over,
})

describe('roleOf', () => {
    it('reads the role, and falls back on is_savings for rows without one', () => {
        expect(roleOf(acc({ name: 'Gold', role: 'asset', is_savings: true }))).toBe('asset')
        expect(roleOf({ role: null, is_savings: true })).toBe('savings')
        expect(roleOf({ role: undefined, is_savings: false })).toBe('everyday')
    })
})

describe('order and default', () => {
    const accounts = [
        acc({ name: 'Jago', role: 'savings', position: 0 }),
        acc({ name: 'BCA', position: 3 }),
        acc({ name: 'Gold', role: 'asset', position: 1 }),
        acc({ name: 'Cash', type: 'cash', position: 2 }),
        acc({ name: 'Visa', role: 'credit', position: 4 }),
    ]

    it('groups by role, in the user’s order inside each group', () => {
        expect(groupByRole(accounts).map(g => [g.role, g.accounts.map(a => a.name)])).toEqual([
            ['everyday', ['Cash', 'BCA']],
            ['credit', ['Visa']],
            ['savings', ['Jago']],
            ['asset', ['Gold']],
        ])
        expect(pickerOrder(accounts)).toHaveLength(accounts.length)
    })

    it('defaults to the first everyday account, never a savings one placed first', () => {
        expect(defaultAccount(accounts)?.name).toBe('Cash')
        expect(defaultAccount([acc({ name: 'Jago', role: 'savings' }), acc({ name: 'Visa', role: 'credit' })])?.name).toBe('Visa')
        expect(defaultAccount([])).toBeNull()
        expect(defaultAccount(undefined)).toBeNull()
    })
})

describe('credit', () => {
    it('can spend down to its limit, or without bound when it has none', () => {
        expect(availableToSpend(acc({ name: 'Visa', role: 'credit', balance: -1_200_000, credit_limit: 10_000_000 }))).toBe(8_800_000)
        expect(availableToSpend(acc({ name: 'Paylater', role: 'credit', balance: -500_000 }))).toBe(Infinity)
        expect(availableToSpend(acc({ name: 'BCA', balance: 300_000, credit_limit: null }))).toBe(300_000)
    })

    it('owes what is below zero', () => {
        expect(owedOn(acc({ name: 'Visa', role: 'credit', balance: -1_200_000 }))).toBe(1_200_000)
        expect(owedOn(acc({ name: 'Visa', role: 'credit', balance: 50_000 }))).toBe(0)
        expect(owedOn(acc({ name: 'BCA', balance: -10_000 }))).toBe(0)
    })
})

describe('balanceBreakdown', () => {
    it('splits the total by role, with credit owed taken off what can be spent', () => {
        expect(balanceBreakdown([
            acc({ name: 'BCA', balance: 4_000_000 }),
            acc({ name: 'Cash', balance: 500_000 }),
            acc({ name: 'Visa', role: 'credit', balance: -1_200_000 }),
            acc({ name: 'Jago', role: 'savings', balance: 3_000_000 }),
            acc({ name: 'Gold', role: 'asset', balance: 5_000_000 }),
        ])).toEqual({ total: 11_300_000, spendable: 3_300_000, saved: 3_000_000, assets: 5_000_000, owed: 1_200_000 })
    })
})
