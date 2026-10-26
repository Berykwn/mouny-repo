import { describe, expect, it } from 'vitest'
import { debt } from '@/test/fixtures'
import { billsForPeriod } from '@/features/bills/lib/bills'
import type { RecurringBill } from '@/types'
import { nextWindow, upcomingPlan } from './upcoming'

function bill(overrides: Partial<RecurringBill> = {}): RecurringBill {
    return {
        id: 'rent',
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

const window = { start: '2026-09-25', end: '2026-10-24' }
const today = '2026-10-19'

describe('nextWindow', () => {
    it('starts the day after and runs as long', () => {
        expect(nextWindow(window)).toEqual({ start: '2026-10-25', end: '2026-11-23' })
    })
})

describe('upcomingPlan', () => {
    const internet = bill({ id: 'internet', name: 'Internet', amount: 350_000, due_day: 22 })
    const rent = bill()
    const bills = [internet, rent]
    // Rent for 1 Oct is paid (no transactions here, so mark it by leaving it out of the dues).
    const dues = billsForPeriod([internet], [], window, today)

    it('splits what is due before payday from what the next period already has', () => {
        const andi = debt({ id: 'andi', type: 'debt', counterparty: 'Andi', remaining_amount: 500_000, due_date: '2026-11-05' })
        const late = debt({ id: 'late', type: 'debt', counterparty: 'Kredivo', remaining_amount: 150_000, due_date: '2026-10-01' })
        const plan = upcomingPlan({ dues, bills, debts: [andi, late], window })

        expect(plan.beforePayday.map(i => i.key)).toEqual(['debt-late', 'bill-internet'])
        expect(plan.setAside).toBe(350_000)
        expect(plan.setAsideCount).toBe(1)
        // Rent on 1 Nov, Andi on 5 Nov, Internet on 22 Nov.
        expect(plan.nextPeriod.map(i => i.key)).toEqual(['bill-rent', 'debt-andi', 'bill-internet'])
        expect(plan.nextCommitted).toBe(2_000_000 + 500_000 + 350_000)
    })

    it('leaves undated debts out and lists receivables by due date', () => {
        const undated = debt({ id: 'x', type: 'debt', due_date: null })
        const rina = debt({ id: 'rina', type: 'receivable', due_date: '2026-10-10' })
        const dimas = debt({ id: 'dimas', type: 'receivable', due_date: null })
        const plan = upcomingPlan({ dues: [], bills: [], debts: [undated, dimas, rina], window })
        expect(plan.beforePayday).toEqual([])
        expect(plan.owedToYou.map(d => d.id)).toEqual(['rina', 'dimas'])
    })
})
