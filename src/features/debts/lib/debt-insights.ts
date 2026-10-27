import { daysUntil, getDaysBetween, toISODate } from '@/lib/helpers'
import { addDays } from '@/lib/dates'
import type { DebtWithAccount } from '@/types'
import type { SavingsPace } from '@/features/wish-list/lib/wish-analytics'

/** A due date within this many days counts as "due soon". */
export const DUE_SOON_DAYS = 7

export type DueStatus =
    | { kind: 'none' }
    | { kind: 'overdue'; days: number }
    | { kind: 'today' }
    | { kind: 'soon'; days: number }
    | { kind: 'later'; days: number }

export function dueStatus(debt: DebtWithAccount): DueStatus {
    if (!debt.due_date) return { kind: 'none' }
    const days = daysUntil(debt.due_date)
    if (days < 0) return { kind: 'overdue', days: -days }
    if (days === 0) return { kind: 'today' }
    if (days <= DUE_SOON_DAYS) return { kind: 'soon', days }
    return { kind: 'later', days }
}

export function debtProgress(debt: DebtWithAccount) {
    const paid = debt.total_amount - debt.remaining_amount
    const percent = debt.total_amount > 0 ? Math.round((paid / debt.total_amount) * 100) : 0
    return { paid, percent }
}

/** Overdue first, then by due date, then undated; bigger amounts break ties. */
export function sortByUrgency(debts: DebtWithAccount[]): DebtWithAccount[] {
    const rank = (d: DebtWithAccount) => d.due_date ? daysUntil(d.due_date) : Number.POSITIVE_INFINITY
    return [...debts].sort((a, b) => rank(a) - rank(b) || b.remaining_amount - a.remaining_amount)
}

export interface DebtSummary {
    owed: number
    receivable: number
    debtCount: number
    receivableCount: number
    overdueDebts: DebtWithAccount[]
    overdueReceivables: DebtWithAccount[]
    /** The nearest open debt or receivable due within DUE_SOON_DAYS (today included). */
    nextDue: DebtWithAccount | null
}

export function summarize(active: DebtWithAccount[]): DebtSummary {
    const summary: DebtSummary = {
        owed: 0, receivable: 0, debtCount: 0, receivableCount: 0,
        overdueDebts: [], overdueReceivables: [], nextDue: null,
    }
    for (const d of sortByUrgency(active)) {
        const isDebt = d.type === 'debt'
        if (isDebt) { summary.owed += d.remaining_amount; summary.debtCount++ }
        else { summary.receivable += d.remaining_amount; summary.receivableCount++ }

        const status = dueStatus(d)
        if (status.kind === 'overdue') (isDebt ? summary.overdueDebts : summary.overdueReceivables).push(d)
        else if (!summary.nextDue && (status.kind === 'today' || status.kind === 'soon')) summary.nextDue = d
    }
    return summary
}

/** Past this, an estimate is too far out to mean anything. */
const MAX_ETA_DAYS = 365 * 10
/** Used to turn days into periods before any period has closed. */
const DEFAULT_PERIOD_DAYS = 30

export type PayoffStatus = 'on-track' | 'behind' | 'overdue' | 'no-date' | 'unknown'

export interface PayoffStop {
    debt: DebtWithAccount
    /** When it would be paid off if leftovers go to debts in plan order; null when out of reach. */
    date: string | null
    status: PayoffStatus
    /** What this debt alone needs each period to be paid by its due date; null without one. */
    perPeriodNeeded: number | null
    /** Periods left before its due date, at least 1; null without one or once it's passed. */
    periodsLeft: number | null
    /** Paid toward it since the open period started (from dated payments); 0 when unknown. */
    paidThisPeriod: number
    /**
     * Still to pay this period: the schedule's first step, or all of it once overdue. 0 once
     * this period's share is paid; null without a due date.
     */
    thisPeriodDue: number | null
    /** This period's share is already paid. */
    doneThisPeriod: boolean
}

export interface PayoffPlan {
    stops: PayoffStop[]
    /** When the last debt would be paid, or null without a usable pace. */
    debtFreeDate: string | null
    /** What's still due this period across every dated debt — the number to act on now. */
    thisPeriod: number
    /** Everything owed, which the usual leftover clears before anything else. */
    owed: number
}

/** Overdue, then by due date, then undated smallest first (quick wins clear a name). */
function payoffOrder(debts: DebtWithAccount[]): DebtWithAccount[] {
    return [...debts].sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        if (a.due_date) return -1
        if (b.due_date) return 1
        return a.remaining_amount - b.remaining_amount
    })
}

/**
 * A payoff plan for what you owe: debts are cleared one at a time in payoffOrder from
 * your usual leftover per period (see savingsPace). A dated debt is on track when that
 * order reaches it by its due date. `paidThisPeriod` (debt id to what its payments dated in
 * the open period add up to) lets a share already paid count as done, instead of asking again.
 */
export function payoffPlan(
    debts: DebtWithAccount[],
    pace: SavingsPace | null,
    today = toISODate(),
    paidThisPeriod: Record<string, number> | null = null,
): PayoffPlan {
    const periodDays = pace?.periodDays && pace.periodDays > 0 ? pace.periodDays : DEFAULT_PERIOD_DAYS
    const canEstimate = !!pace && pace.perDay > 0
    let cumulative = 0
    let thisPeriod = 0
    let reachable = true
    const stops: PayoffStop[] = []

    for (const debt of payoffOrder(debts.filter(d => d.type === 'debt' && d.remaining_amount > 0))) {
        cumulative += debt.remaining_amount

        let date: string | null = null
        if (canEstimate) {
            const days = Math.ceil(cumulative / pace!.perDay)
            if (days <= MAX_ETA_DAYS) date = addDays(today, days)
        }
        if (!date) reachable = false

        const paid = Math.max(0, paidThisPeriod?.[debt.id] ?? 0)
        let perPeriodNeeded: number | null = null
        let periodsLeft: number | null = null
        let thisPeriodDue: number | null = null
        let status: PayoffStatus
        if (!debt.due_date) {
            status = 'no-date'
        } else {
            const daysLeft = getDaysBetween(today, debt.due_date)
            if (daysLeft < 0) {
                status = 'overdue'
                perPeriodNeeded = debt.remaining_amount
                thisPeriodDue = debt.remaining_amount
            } else {
                periodsLeft = Math.max(1, Math.ceil((daysLeft + 1) / periodDays))
                perPeriodNeeded = debt.remaining_amount / periodsLeft
                thisPeriodDue = splitSchedule(debt.remaining_amount, periodsLeft, paid)[0]?.amount ?? 0
                status = !canEstimate ? 'unknown' : date && date <= debt.due_date ? 'on-track' : 'behind'
            }
            thisPeriod += thisPeriodDue
        }

        stops.push({
            debt, date, status, perPeriodNeeded, periodsLeft,
            paidThisPeriod: paid,
            thisPeriodDue,
            doneThisPeriod: thisPeriodDue === 0 && paid > 0,
        })
    }

    return {
        stops,
        debtFreeDate: reachable && stops.length > 0 ? stops[stops.length - 1].date : null,
        thisPeriod: Math.ceil(thisPeriod),
        owed: cumulative,
    }
}

export interface FasterPayoff {
    /** When the leftover alone clears every debt. */
    current: string
    /** One period sooner. */
    sooner: string
    /** What it takes on top of the usual leftover each period, rounded up to a thousand. */
    extraPerPeriod: number
}

/**
 * What it takes to be debt-free a period sooner: the same plan, with a bit more each period
 * than is usually left over. Null when there's no pace, or the end is under two periods away
 * (a period sooner would mean paying almost everything now).
 */
export function fasterPayoff(debts: DebtWithAccount[], pace: SavingsPace | null, today = toISODate()): FasterPayoff | null {
    if (!pace || pace.perDay <= 0 || pace.periodDays <= 0) return null
    const total = debts.filter(d => d.type === 'debt' && d.status === 'active').reduce((s, d) => s + d.remaining_amount, 0)
    if (total <= 0) return null
    const days = Math.ceil(total / pace.perDay)
    if (days > MAX_ETA_DAYS || days < pace.periodDays * 2) return null
    const soonerDays = Math.max(1, days - Math.round(pace.periodDays))
    const extraPerDay = total / soonerDays - pace.perDay
    return {
        current: addDays(today, days),
        sooner: addDays(today, soonerDays),
        extraPerPeriod: Math.ceil((extraPerDay * pace.periodDays) / 1000) * 1000,
    }
}

export interface ScheduleStep {
    /** "This period", "Next period", "Period 3". */
    label: string
    /** Still to pay in that period; 0 for this period once its share is paid. */
    amount: number
    /** The last step lands on the due date. */
    last: boolean
    /** This period's share is already paid. */
    done: boolean
}

const roundUp = (n: number) => Math.ceil(n / 1000) * 1000

/**
 * What's left split over the periods before the due date, in round thousands; the last step
 * takes what's left. This period's share is worked out from what was owed when it started
 * (what's left plus `paid`), so paying it marks the period done, and the rest is spread over
 * the periods after this one.
 */
function splitSchedule(remaining: number, periodsLeft: number, paid: number): ScheduleStep[] {
    if (periodsLeft < 1 || remaining <= 0) return []
    const atStart = remaining + paid
    const share = Math.min(atStart, roundUp(atStart / periodsLeft))
    const nowDue = periodsLeft === 1 ? remaining : Math.max(0, Math.min(remaining, share - paid))
    const steps: ScheduleStep[] = [{ label: 'This period', amount: nowDue, last: nowDue === remaining, done: nowDue === 0 }]

    let left = remaining - nowDue
    const after = periodsLeft - 1
    if (left <= 0 || after <= 0) return steps
    const each = Math.min(left, roundUp(left / after))
    for (let i = 1; i <= after && left > 0; i++) {
        const last = i === after || left <= each
        const amount = last ? left : each
        steps.push({ label: i === 1 ? 'Next period' : `Period ${i + 1}`, amount, last, done: false })
        left -= amount
    }
    return steps
}

/** A dated debt's steps to its due date (see splitSchedule); empty without one or once overdue. */
export function payoffSchedule(stop: Pick<PayoffStop, 'debt' | 'periodsLeft'> & Partial<Pick<PayoffStop, 'paidThisPeriod'>>): ScheduleStep[] {
    if (!stop.periodsLeft) return []
    return splitSchedule(stop.debt.remaining_amount, stop.periodsLeft, stop.paidThisPeriod ?? 0)
}
