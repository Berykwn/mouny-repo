import { dueDatesBetween, type BillDue, type PeriodWindow } from '@/features/bills/lib/bills'
import { getDaysBetween } from '@/lib/helpers'
import type { Debt, RecurringBill } from '@/types'

/**
 * Where the everyday accounts are heading over the next weeks, from what's on the calendar:
 * bills, debt and receivable due dates, paydays, and the usual daily pace. Pure, so the
 * Home card and the Insights chart draw the same line.
 */

export type OutlookEventKind = 'in' | 'bill' | 'debt'

export interface OutlookEvent {
    kind: OutlookEventKind
    label: string
    /** Positive in, negative out. */
    amount: number
}

export interface OutlookPoint {
    date: string
    /** Balance at the end of the day. */
    balance: number
    events: OutlookEvent[]
}

export interface CashOutlook {
    points: OutlookPoint[]
    lowest: OutlookPoint
}

export interface CashOutlookInput {
    today: string
    /** Days after today to look ahead. */
    days: number
    /** What the everyday (non-savings) accounts hold now. */
    startBalance: number
    /** Everyday spending per day so far: applied from tomorrow. */
    dailyPace: number
    bills: RecurringBill[]
    /** The open period's bills: which of its due dates are still unpaid. */
    dues: BillDue[]
    window: Pick<PeriodWindow, 'start' | 'end'>
    /** The income this period was opened with: each payday repeats it. 0 leaves paydays out. */
    expectedIncome: number
    debts: Pick<Debt, 'type' | 'status' | 'counterparty' | 'remaining_amount' | 'due_date'>[]
}

export const OUTLOOK_DAYS = 42

function addDays(date: string, days: number): string {
    const [y, m, d] = date.split('-').map(Number)
    const t = new Date(Date.UTC(y, m - 1, d + days))
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

export function buildCashOutlook(input: CashOutlookInput): CashOutlook {
    const { today, days, startBalance, dailyPace, bills, dues, window, expectedIncome, debts } = input
    const horizon = addDays(today, days)
    const byDate = new Map<string, OutlookEvent[]>()
    // Anything already late lands today: it's still owed.
    const add = (date: string, event: OutlookEvent) => {
        const on = date < today ? today : date
        if (on > horizon) return
        byDate.set(on, [...(byDate.get(on) ?? []), event])
    }

    // This period: only the due dates no payment has covered yet.
    for (const due of dues) {
        if (due.outstanding <= 0) continue
        for (const date of due.dueDates.slice(due.dueDates.length - due.outstanding)) {
            add(date, { kind: 'bill', label: due.bill.name, amount: -due.bill.amount })
        }
    }
    // After the period, every bill comes due as scheduled.
    const afterPeriod = addDays(window.end, 1)
    for (const bill of bills) {
        for (const date of dueDatesBetween(bill, afterPeriod > today ? afterPeriod : today, horizon)) {
            if (date <= window.end) continue
            add(date, { kind: 'bill', label: bill.name, amount: -bill.amount })
        }
    }

    // Paydays at the same length as this period, from the day after it ends.
    const length = getDaysBetween(window.start, window.end) + 1
    if (expectedIncome > 0 && length > 0) {
        for (let payday = afterPeriod; payday <= horizon; payday = addDays(payday, length)) {
            if (payday > today) add(payday, { kind: 'in', label: 'Payday', amount: expectedIncome })
        }
    }

    // Debts on their due date; a receivable only while it's still to come, since a late one may not.
    for (const d of debts) {
        if (d.status !== 'active' || d.remaining_amount <= 0 || !d.due_date) continue
        if (d.type === 'debt') add(d.due_date, { kind: 'debt', label: d.counterparty, amount: -d.remaining_amount })
        else if (d.due_date >= today) add(d.due_date, { kind: 'in', label: d.counterparty, amount: d.remaining_amount })
    }

    const points: OutlookPoint[] = []
    let balance = startBalance
    for (let i = 0; i <= days; i++) {
        const date = addDays(today, i)
        // Today's spending is already out of the balances.
        if (i > 0) balance -= dailyPace
        const events = byDate.get(date) ?? []
        balance += events.reduce((s, e) => s + e.amount, 0)
        points.push({ date, balance, events })
    }
    const lowest = points.reduce((mn, p) => (p.balance < mn.balance ? p : mn), points[0])
    return { points, lowest }
}
