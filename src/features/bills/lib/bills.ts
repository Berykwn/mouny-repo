import type { PayPeriod, RecurringBill, TransactionWithDetails } from '@/types'

/**
 * Recurring bills against pay periods. Dates are YYYY-MM-DD strings throughout, compared as
 * text, so no time zone can shift a due date by a day.
 */

type BillDates = Pick<RecurringBill, 'frequency' | 'due_day' | 'due_month' | 'starts_on' | 'ends_on' | 'paused'>

const pad = (n: number) => String(n).padStart(2, '0')
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

function addDays(date: string, days: number): string {
    const [y, m, d] = date.split('-').map(Number)
    const t = new Date(Date.UTC(y, m - 1, d + days))
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

function addMonths(date: string, months: number): string {
    const [y, m, d] = date.split('-').map(Number)
    const index = y * 12 + (m - 1) + months
    const year = Math.floor(index / 12)
    const month = index % 12 + 1
    return `${year}-${pad(month)}-${pad(Math.min(d, daysInMonth(year, month)))}`
}

/** Every due date from `from` to `to`, both included. A 31st falls on a shorter month's last day. */
export function dueDatesBetween(bill: BillDates, from: string, to: string): string[] {
    if (bill.paused || from > to) return []
    const dates: string[] = []
    let [year, month] = from.split('-').map(Number)
    const [endYear, endMonth] = to.split('-').map(Number)
    while (year < endYear || (year === endYear && month <= endMonth)) {
        if (bill.frequency === 'monthly' || month === bill.due_month) {
            const date = `${year}-${pad(month)}-${pad(Math.min(bill.due_day, daysInMonth(year, month)))}`
            if (date >= from && date <= to && date >= bill.starts_on && (!bill.ends_on || date <= bill.ends_on)) {
                dates.push(date)
            }
        }
        month++
        if (month > 12) { month = 1; year++ }
    }
    return dates
}

/** The next due date on or after `from`, within a year and a month; null when it has ended. */
export function nextDueDate(bill: BillDates, from: string): string | null {
    return dueDatesBetween(bill, from, addMonths(from, 13))[0] ?? null
}

export interface PeriodWindow {
    start: string
    end: string
    /** The period is open and its end is a guess from the one before (or a month). */
    estimated: boolean
}

/** The dates a period covers. An open period runs as long as the one before it, or a month. */
export function periodWindow(period: Pick<PayPeriod, 'id' | 'start_date' | 'end_date'>, periods: Pick<PayPeriod, 'id' | 'start_date' | 'end_date'>[]): PeriodWindow {
    if (period.end_date) return { start: period.start_date, end: period.end_date, estimated: false }
    // Periods are newest first, so the one before is the next entry.
    const index = periods.findIndex(p => p.id === period.id)
    const previous = index >= 0 ? periods[index + 1] : undefined
    if (previous?.end_date) {
        const length = Math.round((Date.parse(previous.end_date) - Date.parse(previous.start_date)) / 86_400_000)
        return { start: period.start_date, end: addDays(period.start_date, length), estimated: true }
    }
    return { start: period.start_date, end: addDays(addMonths(period.start_date, 1), -1), estimated: true }
}

export type BillStatus = 'paid' | 'overdue' | 'soon' | 'upcoming'

export interface BillDue {
    bill: RecurringBill
    /** Due dates that fall in the period. */
    dueDates: string[]
    /** The period's transactions that pay this bill. */
    payments: TransactionWithDetails[]
    paidAmount: number
    /** Due dates not yet covered by a payment. */
    outstanding: number
    /** Money held back for what's still due. */
    reserved: number
    /** The first due date without a payment. */
    nextDue: string | null
    status: BillStatus
}

const SOON_DAYS = 7

/**
 * Each bill that's due in the window or was paid in it. A payment covers the earliest
 * due date first, and paying early counts: rent paid on the 28th covers the 1st.
 */
export function billsForPeriod(
    bills: RecurringBill[],
    transactions: TransactionWithDetails[],
    window: Pick<PeriodWindow, 'start' | 'end'>,
    today: string,
): BillDue[] {
    const soon = addDays(today, SOON_DAYS)
    return bills
        .map((bill): BillDue | null => {
            const dueDates = dueDatesBetween(bill, window.start, window.end)
            const payments = transactions.filter(t => t.recurring_bill_id === bill.id && t.type === 'expense')
            if (dueDates.length === 0 && payments.length === 0) return null
            const outstanding = Math.max(0, dueDates.length - payments.length)
            const nextDue = outstanding > 0 ? dueDates[dueDates.length - outstanding] : null
            const status: BillStatus = !nextDue ? 'paid' : nextDue < today ? 'overdue' : nextDue <= soon ? 'soon' : 'upcoming'
            return {
                bill,
                dueDates,
                payments,
                paidAmount: payments.reduce((s, t) => s + t.amount, 0),
                outstanding,
                reserved: outstanding * bill.amount,
                nextDue,
                status,
            }
        })
        .filter((d): d is BillDue => d !== null)
        .sort((a, b) => {
            // Unpaid first, soonest first; paid at the end.
            if (!a.nextDue !== !b.nextDue) return a.nextDue ? -1 : 1
            return (a.nextDue ?? '').localeCompare(b.nextDue ?? '') || a.bill.name.localeCompare(b.bill.name)
        })
}

export function reservedTotal(dues: BillDue[]): number {
    return dues.reduce((s, d) => s + d.reserved, 0)
}

/** Whether a bill still comes due: not paused and not past its end. */
export function isRunning(bill: Pick<RecurringBill, 'paused' | 'ends_on'>, today: string): boolean {
    return !bill.paused && (!bill.ends_on || bill.ends_on >= today)
}

export interface BillCosts {
    perMonth: number
    perYear: number
    subscriptionsPerYear: number
    count: number
}

const perMonthOf = (b: Pick<RecurringBill, 'frequency' | 'amount'>) => (b.frequency === 'yearly' ? b.amount / 12 : b.amount)

export interface BillShare {
    bill: RecurringBill
    perMonth: number
    /** Of all running bills' monthly cost, 0 to 1. */
    share: number
}

/** Running bills by what they cost a month, biggest first. */
export function billShares(bills: RecurringBill[], today: string): BillShare[] {
    const running = bills.filter(b => isRunning(b, today))
    const total = running.reduce((s, b) => s + perMonthOf(b), 0)
    return running
        .map(bill => ({ bill, perMonth: perMonthOf(bill), share: total > 0 ? perMonthOf(bill) / total : 0 }))
        .sort((a, b) => b.perMonth - a.perMonth || a.bill.name.localeCompare(b.bill.name))
}

export interface YearlyAhead {
    bill: RecurringBill
    date: string
    /** Whole months from now to the due date, at least 1. */
    monthsLeft: number
    /** What to put aside each month to have it ready. */
    perMonth: number
}

/** Yearly bills due within twelve months, soonest first: the ones a monthly view hides. */
export function yearlyAhead(bills: RecurringBill[], today: string): YearlyAhead[] {
    const horizon = addMonths(today, 12)
    const [ty, tm] = today.split('-').map(Number)
    return bills
        .filter(b => b.frequency === 'yearly' && isRunning(b, today))
        .map((bill): YearlyAhead | null => {
            const date = nextDueDate(bill, today)
            if (!date || date > horizon) return null
            const [y, m] = date.split('-').map(Number)
            const monthsLeft = Math.max(1, (y * 12 + m) - (ty * 12 + tm))
            return { bill, date, monthsLeft, perMonth: bill.amount / monthsLeft }
        })
        .filter((a): a is YearlyAhead => a !== null)
        .sort((a, b) => a.date.localeCompare(b.date))
}

/** What the running bills cost, a yearly bill spread over twelve months. */
export function billCosts(bills: RecurringBill[], today: string): BillCosts {
    const running = bills.filter(b => isRunning(b, today))
    const perYearOf = (b: RecurringBill) => (b.frequency === 'yearly' ? b.amount : b.amount * 12)
    const perYear = running.reduce((s, b) => s + perYearOf(b), 0)
    return {
        perMonth: perYear / 12,
        perYear,
        subscriptionsPerYear: running.filter(b => b.kind === 'subscription').reduce((s, b) => s + perYearOf(b), 0),
        count: running.length,
    }
}
