import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import type { Account, AccountRole } from '@/types'
import { accountInsights, accountLine, fullestSource, isOverdrawn, runOutFirst } from './account-insights'

let position = 0
const account = (id: string, balance: number, role: AccountRole = 'everyday', credit_limit: number | null = null): Account => ({
    id, name: id, balance, role, credit_limit, position: position++,
    is_savings: role === 'savings' || role === 'asset',
    type: 'bank', archived_at: null, created_at: null, initial_balance: 0, user_id: 'user-1',
})

const bca = account('BCA', 4_098_000)
const gopay = account('GoPay', 312_000)
const jago = account('Jago', 6_200_000, 'savings')
const spend = (accountId: string, amount: number) =>
    tx({ account_id: accountId, amount, category: { id: 'food', name: 'Food', kind: 'daily' } })

describe('runOutFirst', () => {
    // 10 days in: GoPay spends 78rb a day, BCA 150rb.
    const txs = [tx({ type: 'income', amount: 9_500_000, account_id: 'BCA' }), spend('GoPay', 780_000), ...[1, 2, 3].map(() => spend('BCA', 500_000))]
    const insights = accountInsights([bca, gopay, jago], txs, 10)

    it('names the account that runs out before payday, with a top-up from the fullest one', () => {
        const w = runOutFirst([bca, gopay, jago], insights, 10, 6)
        expect(w?.account.id).toBe('GoPay')
        expect(w?.runwayDays).toBe(4)
        expect(w?.dailyOut).toBe(78_000)
        expect(w?.source?.id).toBe('BCA')
        // 6 days × 78rb = 468rb, less the 312rb there: 156rb, rounded up to 200rb.
        expect(w?.topUp).toBe(200_000)
    })

    it('stays quiet when every account reaches payday', () => {
        expect(runOutFirst([bca, gopay, jago], insights, 10, 3)).toBeNull()
    })

    it('falls back to a week, with no amount, when payday is unknown', () => {
        const w = runOutFirst([bca, gopay, jago], insights, 10, null)
        expect(w?.account.id).toBe('GoPay')
        expect(w?.topUp).toBeNull()
    })
})

describe('roles', () => {
    const gold = account('Gold', 50_000_000, 'asset')
    const card = account('Card', -1_200_000, 'credit', 10_000_000)
    const paylater = account('PayLater', -300_000, 'credit')
    // 10 days in: Card spends 900rb a day, GoPay 78rb.
    const txs = [spend('Card', 9_000_000), spend('GoPay', 780_000), spend('Gold', 1_000_000), spend('PayLater', 500_000)]
    const all = [bca, gopay, jago, gold, card, paylater]
    const insights = accountInsights(all, txs, 10)

    it('gives a card with a limit a runway from what’s left of it, and none without a limit', () => {
        // 8,8jt available at 900rb a day.
        expect(insights.get('Card')?.runwayDays).toBe(9)
        expect(insights.get('PayLater')?.runwayDays).toBeNull()
    })

    it('gives assets and savings no runway', () => {
        expect(insights.get('Gold')?.runwayDays).toBeNull()
        expect(insights.get('Jago')?.runwayDays).toBeNull()
    })

    it('counts a card as overdrawn only past its limit', () => {
        expect(isOverdrawn(card)).toBe(false)
        expect(isOverdrawn(paylater)).toBe(false)
        expect(isOverdrawn(account('Maxed', -10_500_000, 'credit', 10_000_000))).toBe(true)
        expect(isOverdrawn(account('Short', -1, 'savings'))).toBe(true)
        expect(insights.get('Card')?.health).toBe('ok')
    })

    it('words each role’s second line', () => {
        expect(accountLine(card, insights.get('Card')).text).toBe('Rp1,2jt owed · Rp8,8jt available')
        expect(accountLine(paylater, undefined).text).toBe('Rp300rb owed · No limit')
        expect(accountLine(gold, undefined).text).toBe('Not spent from')
        expect(accountLine(jago, undefined).text).toBe('Not counted as spendable')
    })

    it('warns about everyday accounts only, with a top-up never taken from an asset or a card', () => {
        // The card runs out of limit in 9 days, GoPay in 4: only GoPay is named.
        const w = runOutFirst([gold, card, gopay, jago], insights, 10, 20)
        expect(w?.account.id).toBe('GoPay')
        // No everyday account to take from: savings, not the fuller gold.
        expect(w?.source?.id).toBe('Jago')
    })

    it('moves money from everyday first, then savings, never an asset', () => {
        expect(fullestSource(all)?.id).toBe('BCA')
        expect(fullestSource([gold, jago, card])?.id).toBe('Jago')
        expect(fullestSource([gold, card])).toBeNull()
    })
})
