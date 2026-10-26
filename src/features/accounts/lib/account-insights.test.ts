import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import type { Account } from '@/types'
import { accountInsights, runOutFirst } from './account-insights'

const account = (id: string, balance: number, is_savings = false): Account => ({
    id, name: id, balance, is_savings, type: 'bank', archived_at: null, created_at: null, initial_balance: 0, user_id: 'user-1',
})

const bca = account('BCA', 4_098_000)
const gopay = account('GoPay', 312_000)
const jago = account('Jago', 6_200_000, true)
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
