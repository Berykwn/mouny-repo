import { addDays, billsForPeriod, type BillDue, type PeriodWindow } from '@/features/bills/lib/bills'
import type { DebtWithAccount, RecurringBill } from '@/types'

/**
 * What's still to pay, by pay period: this one until payday, and the next. Bills come
 * from their schedules, debts from their due dates; nothing is placed by a guess.
 */

export type UpcomingItem =
    | { kind: 'bill'; key: string; date: string; amount: number; bill: RecurringBill; due: BillDue; count: number }
    | { kind: 'debt'; key: string; date: string; amount: number; debt: DebtWithAccount }

export interface UpcomingPlan {
    beforePayday: UpcomingItem[]
    nextPeriod: UpcomingItem[]
    /** Money you're owed, most urgent first. */
    owedToYou: DebtWithAccount[]
    /** Bills still due before payday: what safe to spend already holds back. */
    setAside: number
    setAsideCount: number
    /** Everything already due in the next period. */
    nextCommitted: number
    next: Pick<PeriodWindow, 'start' | 'end'>
}

/** The next period, as long as this one and starting the day after it ends. */
export function nextWindow(window: Pick<PeriodWindow, 'start' | 'end'>): Pick<PeriodWindow, 'start' | 'end'> {
    const length = Math.round((Date.parse(window.end) - Date.parse(window.start)) / 86_400_000)
    const start = addDays(window.end, 1)
    return { start, end: addDays(start, length) }
}

const byDate = (a: UpcomingItem, b: UpcomingItem) =>
    a.date.localeCompare(b.date) || b.amount - a.amount || a.key.localeCompare(b.key)

export function upcomingPlan({ dues, bills, debts, window }: {
    /** This period's bills (useBillReserve). */
    dues: BillDue[]
    bills: RecurringBill[]
    /** Open debts and receivables. */
    debts: DebtWithAccount[]
    window: Pick<PeriodWindow, 'start' | 'end'>
}): UpcomingPlan {
    const next = nextWindow(window)
    const owe = debts.filter(d => d.type === 'debt' && d.status === 'active' && d.remaining_amount > 0 && d.due_date)
    const debtItem = (d: DebtWithAccount): UpcomingItem => ({ kind: 'debt', key: `debt-${d.id}`, date: d.due_date!, amount: d.remaining_amount, debt: d })

    const billsNow: UpcomingItem[] = dues
        .filter(d => d.outstanding > 0 && d.nextDue)
        .map(d => ({ kind: 'bill', key: `bill-${d.bill.id}`, date: d.nextDue!, amount: d.reserved, bill: d.bill, due: d, count: d.outstanding }))
    // Overdue debts belong to now: they're owed before payday too.
    const beforePayday = [...billsNow, ...owe.filter(d => d.due_date! <= window.end).map(debtItem)].sort(byDate)

    // Nothing in the next period is paid yet, so every due date in it counts.
    const nextBills: UpcomingItem[] = billsForPeriod(bills, [], next, next.start)
        .filter(d => d.outstanding > 0)
        .map(d => ({ kind: 'bill', key: `bill-${d.bill.id}`, date: d.dueDates[0], amount: d.reserved, bill: d.bill, due: d, count: d.outstanding }))
    const nextPeriod = [...nextBills, ...owe.filter(d => d.due_date! >= next.start && d.due_date! <= next.end).map(debtItem)].sort(byDate)

    const rank = (d: DebtWithAccount) => d.due_date ?? '9999-12-31'
    const owedToYou = debts
        .filter(d => d.type === 'receivable' && d.status === 'active' && d.remaining_amount > 0)
        .sort((a, b) => rank(a).localeCompare(rank(b)) || b.remaining_amount - a.remaining_amount)

    return {
        beforePayday,
        nextPeriod,
        owedToYou,
        setAside: billsNow.reduce((s, i) => s + i.amount, 0),
        setAsideCount: billsNow.length,
        nextCommitted: nextPeriod.reduce((s, i) => s + i.amount, 0),
        next,
    }
}
