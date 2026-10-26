import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { BillDue } from '@/features/bills/lib/bills'
import type { RecurringBill } from '@/types'
import { heroNumbers, pickSmartLine, type SmartLineInput } from './home'
import { buildCashOutlook } from './cash-outlook'

function stats(overrides: Partial<PeriodStats> = {}): PeriodStats {
    return {
        totalIncome: 10_000_000,
        totalExpense: 2_000_000,
        totalSavings: 0,
        totalSpending: 2_000_000,
        oneOffSpending: 0,
        remaining: 8_000_000,
        reservedBills: 0,
        daysElapsed: 12,
        totalDays: 30,
        daysRemaining: 18,
        dailyAvg: 150_000,
        safeDaily: 421_052,
        projectedSpend: 4_700_000,
        projectedClose: 5_300_000,
        runwayDays: 53,
        noSpendDays: 0,
        isEndDateEstimated: false,
        isClosed: false,
        ...overrides,
    }
}

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
        starts_on: '2026-01-01',
        ends_on: null,
        paused: false,
        account_id: null,
        category_id: null,
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    }
}

function due(b: RecurringBill, overrides: Partial<BillDue> = {}): BillDue {
    return { bill: b, dueDates: ['2026-10-23'], payments: [], paidAmount: 0, outstanding: 1, reserved: b.amount, nextDue: '2026-10-23', status: 'soon', ...overrides }
}

function input(overrides: Partial<SmartLineInput> = {}): SmartLineInput {
    return {
        today: '2026-10-19',
        bills: [],
        recentTransactions: [],
        debts: [],
        budgets: [],
        transactions: [],
        daysLeft: 6,
        accounts: [],
        dues: [],
        ...overrides,
    }
}

describe('heroNumbers', () => {
    it('is on track while the pace is within what is safe', () => {
        const hero = heroNumbers(stats())
        expect(hero.status).toBe('on-track')
        expect(hero.today).toBe(421_052)
        expect(hero.daysLeft).toBe(19)
        expect(hero.used).toBeCloseTo(0.2)
        expect(hero.elapsed).toBeCloseTo(0.4)
    })

    it('is tight once the pace runs faster than safe', () => {
        expect(heroNumbers(stats({ dailyAvg: 500_000 })).status).toBe('tight')
    })

    it('does not call a pace tight from the first days', () => {
        expect(heroNumbers(stats({ dailyAvg: 500_000, daysElapsed: 2 })).status).toBe('on-track')
    })

    it('is over once the money is gone', () => {
        expect(heroNumbers(stats({ remaining: -10_000 })).status).toBe('over')
    })

    it('has no pace or today marker for a closed period', () => {
        const hero = heroNumbers(stats({ isClosed: true, safeDaily: null, daysRemaining: 0 }))
        expect(hero).toMatchObject({ status: 'closed', today: 8_000_000, elapsed: null, daysLeft: null })
    })
})

describe('pickSmartLine', () => {
    it('says nothing when nothing applies', () => {
        expect(pickSmartLine(input())).toBeNull()
    })

    it('flags a bill whose latest payment differs from its amount', () => {
        const netflix = bill()
        const line = pickSmartLine(input({
            bills: [netflix],
            recentTransactions: [
                tx({ recurring_bill_id: 'netflix', amount: 54_000, date: '2026-08-23' }),
                tx({ recurring_bill_id: 'netflix', amount: 65_000, date: '2026-09-23' }),
            ],
        }))
        expect(line?.kind).toBe('bill-changed')
        expect(line?.parts.map(p => p.text).join('')).toContain('Netflix was paid')
        expect(line?.action.to).toBe('/bills')
    })

    it('ignores a bill whose latest payment matches', () => {
        const line = pickSmartLine(input({
            bills: [bill()],
            recentTransactions: [
                tx({ recurring_bill_id: 'netflix', amount: 65_000, date: '2026-08-23' }),
                tx({ recurring_bill_id: 'netflix', amount: 54_000, date: '2026-09-23' }),
            ],
        }))
        expect(line).toBeNull()
    })

    it('puts a changed bill before an overdue receivable', () => {
        const line = pickSmartLine(input({
            bills: [bill()],
            recentTransactions: [tx({ recurring_bill_id: 'netflix', amount: 65_000, date: '2026-09-23' })],
            debts: [{ id: 'd', type: 'receivable', status: 'active', counterparty: 'Andi', remaining_amount: 500_000, due_date: '2026-10-10' }],
        }))
        expect(line?.kind).toBe('bill-changed')
    })

    it('flags an overdue receivable, not one still to come', () => {
        const later = { id: 'a', type: 'receivable', status: 'active', counterparty: 'Rina', remaining_amount: 100_000, due_date: '2026-11-01' }
        expect(pickSmartLine(input({ debts: [later] }))).toBeNull()
        const line = pickSmartLine(input({ debts: [later, { ...later, id: 'b', counterparty: 'Andi', due_date: '2026-10-10' }] }))
        expect(line?.kind).toBe('receivable-overdue')
        expect(line?.parts[0].text).toContain('Andi')
    })

    it('flags the budget most used up, from 80%', () => {
        const coffee = { id: 'coffee', name: 'Coffee' }
        const food = { id: 'food', name: 'Food' }
        const line = pickSmartLine(input({
            budgets: [{ category_id: 'coffee', amount: 300_000 }, { category_id: 'food', amount: 1_000_000 }],
            transactions: [tx({ amount: 260_000, category: coffee }), tx({ amount: 900_000, category: food })],
        }))
        expect(line?.kind).toBe('budget-low')
        expect(line?.parts.map(p => p.text).join('')).toMatch(/^Food has Rp\s100\.000 left of its Rp\s1\.000\.000 budget, with 6 days to go\.$/)
    })

    it('says by how much a budget is over', () => {
        const line = pickSmartLine(input({
            budgets: [{ category_id: 'coffee', amount: 300_000 }],
            transactions: [tx({ amount: 350_000, category: { id: 'coffee', name: 'Coffee' } })],
        }))
        expect(line?.parts.map(p => p.text).join('')).toMatch(/^Coffee is .*50\.000 over its/)
    })

    it('flags an account that cannot cover the bills due from it', () => {
        const internet = bill({ id: 'net', name: 'Internet', amount: 350_000, account_id: 'bca' })
        const line = pickSmartLine(input({
            accounts: [{ id: 'bca', name: 'BCA', balance: 120_000, is_savings: false }],
            dues: [due(internet)],
        }))
        expect(line?.kind).toBe('account-short')
        expect(line?.action.to).toBe('/accounts')
    })

    it('leaves savings accounts alone', () => {
        const line = pickSmartLine(input({ accounts: [{ id: 's', name: 'Tabungan', balance: -5, is_savings: true }] }))
        expect(line).toBeNull()
    })
})

describe('buildCashOutlook', () => {
    const base = {
        today: '2026-10-19',
        days: 14,
        startBalance: 1_000_000,
        dailyPace: 10_000,
        bills: [],
        dues: [],
        window: { start: '2026-09-25', end: '2026-10-24' },
        expectedIncome: 0,
        debts: [],
    }

    it('runs the daily pace from tomorrow', () => {
        const { points } = buildCashOutlook(base)
        expect(points).toHaveLength(15)
        expect(points[0].balance).toBe(1_000_000)
        expect(points[14].balance).toBe(860_000)
    })

    it('takes unpaid bills this period, then every bill after it, and adds paydays', () => {
        const netflix = bill()
        const { points, lowest } = buildCashOutlook({
            ...base,
            dailyPace: 0,
            bills: [netflix],
            dues: [due(netflix)],
            expectedIncome: 5_000_000,
        })
        expect(points.find(p => p.date === '2026-10-23')?.events).toEqual([{ kind: 'bill', label: 'Netflix', amount: -54_000 }])
        expect(points.find(p => p.date === '2026-10-25')?.events[0]).toMatchObject({ kind: 'in', amount: 5_000_000 })
        expect(lowest.balance).toBe(946_000)
    })

    it('does not count a bill already paid this period', () => {
        const netflix = bill()
        const { points } = buildCashOutlook({ ...base, dailyPace: 0, bills: [netflix], dues: [due(netflix, { outstanding: 0, reserved: 0 })] })
        expect(points[points.length - 1].balance).toBe(1_000_000)
    })

    it('counts a late debt today and leaves out a late receivable', () => {
        const { points } = buildCashOutlook({
            ...base,
            dailyPace: 0,
            debts: [
                { type: 'debt', status: 'active', counterparty: 'Andi', remaining_amount: 200_000, due_date: '2026-10-01' },
                { type: 'receivable', status: 'active', counterparty: 'Rina', remaining_amount: 300_000, due_date: '2026-10-01' },
            ],
        })
        expect(points[0].balance).toBe(800_000)
    })
})
