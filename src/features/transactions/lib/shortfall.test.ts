import { describe, expect, it } from 'vitest'
import type { Account } from '@/types'
import { roundedTopUp, shortfallFor, shortfallLine, topUpSource } from './shortfall'

const account = (id: string, balance: number, role: Account['role'] = 'everyday', credit_limit: number | null = null) =>
    ({ id, name: id, balance, role, credit_limit, type: 'bank', is_savings: role === 'savings', position: 0 }) as Account

describe('roundedTopUp', () => {
    it('rounds the shortfall up to the next 50.000', () => {
        expect(roundedTopUp(19_000, 1_000_000)).toBe(50_000)
        expect(roundedTopUp(50_000, 1_000_000)).toBe(50_000)
        expect(roundedTopUp(50_001, 1_000_000)).toBe(100_000)
    })

    it('never asks for more than the source holds', () => {
        expect(roundedTopUp(19_000, 30_000)).toBe(30_000)
    })

    it('offers nothing when the source can’t cover the shortfall itself', () => {
        expect(roundedTopUp(19_000, 18_000)).toBeNull()
    })

    it('offers nothing when nothing is short', () => {
        expect(roundedTopUp(0, 1_000_000)).toBeNull()
    })
})

describe('topUpSource', () => {
    it('is the fullest other everyday account, never savings or a card', () => {
        const list = [
            account('Cash', 181_000),
            account('BCA', 2_000_000),
            account('GoPay', 300_000),
            account('Savings', 9_000_000, 'savings'),
            account('Visa', 5_000_000, 'credit', 10_000_000),
        ]
        expect(topUpSource(list, ['Cash'])?.id).toBe('BCA')
        expect(topUpSource(list, ['Cash', 'BCA'])?.id).toBe('GoPay')
    })

    it('is none when no other everyday account has money', () => {
        expect(topUpSource([account('Cash', 10_000), account('BCA', 0)], ['Cash'])).toBeNull()
    })
})

describe('shortfallFor', () => {
    const cash = account('Cash', 181_000)
    const bca = account('BCA', 2_000_000)

    it('is null when the account can give the amount', () => {
        expect(shortfallFor(cash, 181_000, [cash, bca])).toBeNull()
        expect(shortfallFor(cash, 0, [cash, bca])).toBeNull()
    })

    it('names the shortfall and a rounded top-up', () => {
        expect(shortfallFor(cash, 200_000, [cash, bca])).toMatchObject({ short: 19_000, source: { id: 'BCA' }, topUp: 50_000 })
    })

    it('offers no top-up when no source has enough', () => {
        const poor = account('BCA', 10_000)
        expect(shortfallFor(cash, 200_000, [cash, poor])).toMatchObject({ short: 19_000, source: null, topUp: null })
    })

    it('counts money the same entry already took out as available', () => {
        expect(shortfallFor(cash, 200_000, [cash, bca], { heldBack: 25_000 })).toBeNull()
    })

    it('skips excluded accounts as a source (a transfer’s destination)', () => {
        expect(shortfallFor(cash, 200_000, [cash, bca], { exclude: ['BCA'] })?.source).toBeNull()
    })

    it('reads a card against what’s left of its limit', () => {
        const card = account('Visa', -900_000, 'credit', 1_000_000)
        expect(shortfallFor(card, 150_000, [card, bca])).toMatchObject({ available: 100_000, short: 50_000, topUp: 50_000 })
        expect(shortfallFor(account('PayLater', -900_000, 'credit', null), 5_000_000, [bca])).toBeNull()
    })
})

describe('shortfallLine', () => {
    it('names the account and what it shows', () => {
        expect(shortfallLine({ account: account('Cash', 181_000), available: 181_000 }))
            .toMatch(/^Cash shows Rp\s?181\.000 — probably a top-up/)
    })
})
