import { daysUntil, getDaysBetween, toISODate } from '@/lib/helpers'
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

/** The short pill for a due date that needs attention, or null when it doesn't. */
export function duePill(status: DueStatus): { label: string; className: string } | null {
    switch (status.kind) {
        case 'overdue': return { label: `${status.days}d overdue`, className: 'bg-negative/10 text-negative' }
        case 'today': return { label: 'Due today', className: 'bg-warning/10 text-warning' }
        case 'soon': return { label: `In ${status.days}d`, className: 'bg-warning/10 text-warning' }
        default: return null
    }
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

/** How far ahead "Coming up" looks. */
export const UPCOMING_DAYS = 30
const UPCOMING_MAX = 5

/** Overdue and due-within-UPCOMING_DAYS records on both sides, soonest first. */
export function upcoming(active: DebtWithAccount[]): DebtWithAccount[] {
    return sortByUrgency(active)
        .filter(d => d.due_date && daysUntil(d.due_date) <= UPCOMING_DAYS)
        .slice(0, UPCOMING_MAX)
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
}

export interface PayoffPlan {
    stops: PayoffStop[]
    /** When the last debt would be paid, or null without a usable pace. */
    debtFreeDate: string | null
    /** Sum of every dated debt's per-period share — the number to act on this period. */
    thisPeriod: number
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

function addDays(today: string, days: number): string {
    const date = new Date(today + 'T00:00:00')
    date.setDate(date.getDate() + days)
    return toISODate(date)
}

/**
 * A payoff plan for what you owe: debts are cleared one at a time in payoffOrder from
 * your usual leftover per period (see savingsPace). A dated debt is on track when that
 * order reaches it by its due date.
 */
export function payoffPlan(debts: DebtWithAccount[], pace: SavingsPace | null, today = toISODate()): PayoffPlan {
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

        let perPeriodNeeded: number | null = null
        let status: PayoffStatus
        if (!debt.due_date) {
            status = 'no-date'
        } else {
            const daysLeft = getDaysBetween(today, debt.due_date)
            if (daysLeft < 0) {
                status = 'overdue'
                perPeriodNeeded = debt.remaining_amount
            } else {
                perPeriodNeeded = debt.remaining_amount / Math.max(1, Math.ceil((daysLeft + 1) / periodDays))
                status = !canEstimate ? 'unknown' : date && date <= debt.due_date ? 'on-track' : 'behind'
            }
            thisPeriod += perPeriodNeeded
        }

        stops.push({ debt, date, status, perPeriodNeeded })
    }

    return {
        stops,
        debtFreeDate: reachable && stops.length > 0 ? stops[stops.length - 1].date : null,
        thisPeriod: Math.ceil(thisPeriod),
    }
}
