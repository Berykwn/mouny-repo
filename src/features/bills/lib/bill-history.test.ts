import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import type { RecurringBill } from '@/types'
import { lastPriceChange, paymentsByBill, subscriptionAudit, type BillPayment } from './bill-history'

function bill(overrides: Partial<RecurringBill> = {}): RecurringBill {
    return {
        id: 'netflix',
        user_id: 'user-1',
        name: 'Netflix',
        amount: 54_000,
        kind: 'subscription',
        frequency: 'monthly',
        due_day: 23,
        due_month: null,
        category_id: null,
        account_id: null,
        starts_on: '2026-01-01',
        ends_on: null,
        paused: false,
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    }
}

const pay = (date: string, amount: number): BillPayment => ({ id: date, date, amount, account: 'BCA' })

describe('paymentsByBill', () => {
    it('groups expenses by bill, oldest first, each transaction once', () => {
        const a = tx({ id: 'a', recurring_bill_id: 'netflix', date: '2026-09-23', amount: 65_000 })
        const b = tx({ id: 'b', recurring_bill_id: 'netflix', date: '2026-08-23', amount: 54_000 })
        const other = tx({ id: 'c', date: '2026-09-01' })
        const map = paymentsByBill([[a, other], [b, a]])
        expect(map.get('netflix')?.map(p => p.amount)).toEqual([54_000, 65_000])
        expect(map.get('netflix')?.[0].account).toBe('BCA')
        expect(map.size).toBe(1)
    })
})

describe('lastPriceChange', () => {
    it('compares the latest payment with the one before', () => {
        expect(lastPriceChange([pay('2026-07-23', 54_000), pay('2026-08-23', 54_000), pay('2026-09-23', 65_000)]))
            .toEqual({ from: 54_000, to: 65_000, percent: 20, since: '2026-09-23' })
    })

    it('says nothing without two payments or a change', () => {
        expect(lastPriceChange([pay('2026-09-23', 65_000)])).toBeNull()
        expect(lastPriceChange([pay('2026-08-23', 65_000), pay('2026-09-23', 65_000)])).toBeNull()
    })
})

describe('subscriptionAudit', () => {
    const today = '2026-10-19'

    it('finds the biggest rise and the paused ones', () => {
        const gym = bill({ id: 'gym', name: 'Gym', amount: 250_000, paused: true })
        const payments = new Map([
            ['netflix', [pay('2026-08-23', 54_000), pay('2026-09-23', 65_000)]],
            ['gym', [pay('2026-07-02', 250_000)]],
        ])
        const audit = subscriptionAudit([bill(), gym], payments, today)
        expect(audit?.rise?.bill.id).toBe('netflix')
        expect(audit?.rise?.change.percent).toBe(20)
        expect(audit?.paused).toEqual([{ bill: gym, lastPaid: '2026-07-02' }])
        expect(audit?.perYear).toBe(54_000 * 12)
    })

    it('stays quiet when nothing changed', () => {
        const payments = new Map([['netflix', [pay('2026-08-23', 54_000), pay('2026-09-23', 54_000)]]])
        expect(subscriptionAudit([bill()], payments, today)).toBeNull()
    })

    it('ignores price drops and plain bills', () => {
        const rent = bill({ id: 'rent', kind: 'bill' })
        const payments = new Map([
            ['netflix', [pay('2026-08-23', 65_000), pay('2026-09-23', 54_000)]],
            ['rent', [pay('2026-08-01', 1_000), pay('2026-09-01', 2_000)]],
        ])
        expect(subscriptionAudit([bill(), rent], payments, today)).toBeNull()
    })
})
