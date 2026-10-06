import type { RecurringBill } from '@/types'
import { daysUntil } from '@/lib/helpers'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

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
    const [y, m] = bill.ends_on.split('-').map(Number)
    return `${when} · until ${MONTHS[m - 1]} ${y}`
}

/** "Due today", "In 3 days", "2 days overdue". */
export function dueLabel(date: string): string {
    const days = daysUntil(date)
    if (days === 0) return 'Due today'
    if (days === 1) return 'Due tomorrow'
    if (days > 0) return `In ${days} days`
    return `${-days} day${days === -1 ? '' : 's'} overdue`
}
