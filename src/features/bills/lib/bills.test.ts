import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import type { RecurringBill } from '@/types'
import { billCosts, billsForPeriod, dueDatesBetween, nextDueDate, periodWindow, reservedTotal } from './bills'

function bill(overrides: Partial<RecurringBill> = {}): RecurringBill {
    return {
        id: 'bill-1',
        user_id: 'user-1',
        name: 'Rent',
        amount: 2_000_000,
        kind: 'bill',
        frequency: 'monthly',
        due_day: 1,
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

describe('dueDatesBetween', () => {
    it('lists monthly due dates in range', () => {
        expect(dueDatesBetween(bill({ due_day: 5 }), '2026-09-25', '2026-11-24')).toEqual(['2026-10-05', '2026-11-05'])
    })

    it('puts a 31st on the last day of shorter months', () => {
        expect(dueDatesBetween(bill({ due_day: 31 }), '2026-02-01', '2026-04-30')).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
    })

    it('keeps yearly bills to their month', () => {
        const domain = bill({ frequency: 'yearly', due_day: 12, due_month: 3 })
        expect(dueDatesBetween(domain, '2026-01-01', '2027-12-31')).toEqual(['2026-03-12', '2027-03-12'])
    })

    it('respects start, end and pause', () => {
        const loan = bill({ due_day: 10, starts_on: '2026-10-01', ends_on: '2026-12-10' })
        expect(dueDatesBetween(loan, '2026-09-01', '2027-02-28')).toEqual(['2026-10-10', '2026-11-10', '2026-12-10'])
        expect(dueDatesBetween(bill({ paused: true }), '2026-01-01', '2026-12-31')).toEqual([])
    })

    it('finds the next due date', () => {
        expect(nextDueDate(bill({ due_day: 15 }), '2026-10-16')).toBe('2026-11-15')
        expect(nextDueDate(bill({ ends_on: '2026-09-01' }), '2026-10-01')).toBeNull()
    })
})

describe('periodWindow', () => {
    it('uses a closed period’s own dates', () => {
        expect(periodWindow({ id: 'p', start_date: '2026-09-25', end_date: '2026-10-24' }, [])).toEqual({ start: '2026-09-25', end: '2026-10-24', estimated: false })
    })

    it('estimates an open period from the one before', () => {
        const periods = [
            { id: 'now', start_date: '2026-10-25', end_date: null },
            { id: 'before', start_date: '2026-09-25', end_date: '2026-10-24' },
        ]
        // 30 days before, so 30 days now: 25 Oct to 23 Nov.
        expect(periodWindow(periods[0], periods)).toEqual({ start: '2026-10-25', end: '2026-11-23', estimated: true })
    })

    it('falls back to a month', () => {
        expect(periodWindow({ id: 'p', start_date: '2026-10-25', end_date: null }, []).end).toBe('2026-11-24')
    })
})

describe('billsForPeriod', () => {
    const window = { start: '2026-10-01', end: '2026-10-31' }

    it('reserves what is still due and drops what is paid', () => {
        const rent = bill({ id: 'rent', due_day: 1 })
        const netflix = bill({ id: 'netflix', name: 'Netflix', amount: 186_000, due_day: 20, kind: 'subscription' })
        const dues = billsForPeriod([rent, netflix], [
            tx({ recurring_bill_id: 'rent', amount: 2_000_000, date: '2026-10-01' }),
        ], window, '2026-10-15')

        expect(dues.map(d => [d.bill.id, d.status, d.reserved])).toEqual([
            ['netflix', 'soon', 186_000],
            ['rent', 'paid', 0],
        ])
        expect(reservedTotal(dues)).toBe(186_000)
    })

    it('flags overdue and soon', () => {
        const dues = billsForPeriod([
            bill({ id: 'late', due_day: 3 }),
            bill({ id: 'soon', due_day: 18 }),
        ], [], window, '2026-10-15')
        expect(dues.map(d => [d.bill.id, d.status])).toEqual([['late', 'overdue'], ['soon', 'soon']])
    })

    it('ignores bills with nothing due and no payment', () => {
        const yearly = bill({ frequency: 'yearly', due_month: 3 })
        expect(billsForPeriod([yearly], [], window, '2026-10-15')).toEqual([])
    })

    it('counts an early payment for the period', () => {
        const dues = billsForPeriod([bill({ id: 'rent', due_day: 28 })], [
            tx({ recurring_bill_id: 'rent', date: '2026-10-02' }),
        ], window, '2026-10-05')
        expect(dues[0]).toMatchObject({ status: 'paid', reserved: 0, outstanding: 0 })
    })
})

describe('billCosts', () => {
    it('spreads yearly bills and leaves out stopped ones', () => {
        const costs = billCosts([
            bill({ amount: 1_200_000 }),
            bill({ amount: 186_000, kind: 'subscription' }),
            bill({ amount: 240_000, kind: 'subscription', frequency: 'yearly', due_month: 3 }),
            bill({ amount: 999_000, paused: true }),
            bill({ amount: 999_000, ends_on: '2026-01-01' }),
        ], '2026-10-01')
        expect(costs).toEqual({
            perYear: 1_200_000 * 12 + 186_000 * 12 + 240_000,
            perMonth: (1_200_000 * 12 + 186_000 * 12 + 240_000) / 12,
            subscriptionsPerYear: 186_000 * 12 + 240_000,
            count: 3,
        })
    })
})
