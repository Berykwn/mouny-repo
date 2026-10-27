import type { RecurringBill } from '@/types'
import { daysUntil, formatShortCurrency } from '@/lib/helpers'
import { MONTHS_LONG, MONTHS_SHORT as MONTHS, monthLabel, monthYearLabel } from '@/lib/dates'

export const MONTH_NAMES = MONTHS_LONG

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "Wed 22 Oct" */
export function dayDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number)
    return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`
}

/** "in 3 days", "today", "tomorrow", "2 days late": the tail after a date. */
export function relativeDays(days: number): string {
    if (days === 0) return 'today'
    if (days === 1) return 'tomorrow'
    if (days > 0) return `in ${days} days`
    return `${-days} day${days === -1 ? '' : 's'} late`
}

/** "Oct 2026" */
export const monthYear = monthYearLabel

/** "5 Oct" */
export function shortDate(date: string): string {
    const [, m, d] = date.split('-').map(Number)
    return `${d} ${MONTHS[m - 1]}`
}

function ordinal(n: number): string {
    const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
    return `${n}${tail}`
}

/** "Monthly on the 5th", "Yearly on 12 Mar", with "until Dec 2026" for an installment. */
export function scheduleLabel(bill: Pick<RecurringBill, 'frequency' | 'due_day' | 'due_month' | 'ends_on'>): string {
    const when = bill.frequency === 'yearly' && bill.due_month
        ? `Yearly on ${bill.due_day} ${MONTHS[bill.due_month - 1]}`
        : `Monthly on the ${ordinal(bill.due_day)}`
    if (!bill.ends_on) return when
    return `${when} · until ${monthYearLabel(bill.ends_on)}`
}

/**
 * A yearly bill's advance warning, from its own amount and due date: "Insurance (Rp 2,4jt) is
 * due in March: putting aside Rp 480rb a month covers it." The monthly amount rounds up to a
 * thousand so it really does cover it. Without `named`, it starts at "Due in March".
 */
export function setAsideText(
    ahead: { bill: Pick<RecurringBill, 'name' | 'amount'>; date: string; monthsLeft: number; perMonth: number },
    today: string,
    named = false,
): string {
    const month = monthLabel(ahead.date, today)
    const head = named ? `${ahead.bill.name} (Rp ${formatShortCurrency(ahead.bill.amount)}) is due in ${month}` : `Due in ${month}`
    if (ahead.monthsLeft <= 1) return `${head}: have the full Rp ${formatShortCurrency(ahead.bill.amount)} ready by then.`
    const perMonth = Math.ceil(ahead.perMonth / 1000) * 1000
    return `${head}: putting aside Rp ${formatShortCurrency(perMonth)} a month covers it.`
}

/** "Due today", "In 3 days", "2 days overdue". */
export function dueLabel(date: string): string {
    const days = daysUntil(date)
    if (days === 0) return 'Due today'
    if (days === 1) return 'Due tomorrow'
    if (days > 0) return `In ${days} days`
    return `${-days} day${days === -1 ? '' : 's'} overdue`
}
