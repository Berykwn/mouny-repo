import { getDaysBetween, toISODate } from '@/lib/helpers'
import type { PeriodSummary } from '@/lib/period-summary'
import type { PayPeriod, WishListItem } from '@/types'

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

/** How many recent closed periods the savings pace is averaged over. */
export const PACE_PERIODS = 3

/** Past this, an estimate is too far out to mean anything. */
const MAX_ETA_DAYS = 365 * 10

export interface WishProgress {
    /** Rupiah value of the goal, or null when no price is set. */
    target: number | null
    /** Rupiah already put toward it. */
    saved: number
    /** Rupiah still needed (0 once ready), or null without a target. */
    remaining: number | null
    /** 0–100 */
    percent: number
    ready: boolean
}

export interface PartsBreakdown {
    total: number
    bought: number
    /** Paid for the parts already bought. */
    spent: number
    /** Estimated price of the parts still to buy (unpriced ones count as 0). */
    openTotal: number
    /** Parts still to buy that have no price yet. */
    unpriced: number
}

/** A split wish's parts in numbers, or null when the wish isn't split. */
export function partsBreakdown(item: WishListItem): PartsBreakdown | null {
    const parts = item.parts ?? []
    if (parts.length === 0) return null
    let bought = 0, spent = 0, openTotal = 0, unpriced = 0
    for (const part of parts) {
        if (part.is_purchased) {
            bought++
            spent += part.paid_amount ?? 0
        } else if (part.estimated_price && part.estimated_price > 0) {
            openTotal += part.estimated_price
        } else {
            unpriced++
        }
    }
    return { total: parts.length, bought, spent, openTotal, unpriced }
}

/**
 * A split wish: the goal is what was paid for the bought parts plus the estimate of the
 * rest, and progress counts both what was spent on parts and what's set aside. Ready once
 * the savings cover every remaining part and each of them has a price.
 */
function splitProgress(item: WishListItem, b: PartsBreakdown): WishProgress {
    const total = b.spent + b.openTotal
    const target = total > 0 ? total : null
    const saved = b.spent + item.saved_amount
    const remaining = target === null ? null : Math.max(0, b.openTotal - item.saved_amount)
    return {
        target,
        saved,
        remaining,
        percent: target ? Math.min(100, Math.round((saved / target) * 100)) : 0,
        ready: b.unpriced === 0 && remaining === 0,
    }
}

export function wishProgress(item: WishListItem): WishProgress {
    const parts = partsBreakdown(item)
    if (parts) return splitProgress(item, parts)

    if (item.quantity) {
        const savedQty = item.saved_quantity ?? 0
        const price = item.price_per_unit ?? 0
        const target = item.quantity > 0 && price > 0 ? Math.round(item.quantity * price) : null
        const ready = item.quantity > 0 && savedQty >= item.quantity
        const remaining = target === null ? null : ready ? 0 : Math.max(0, Math.round((item.quantity - savedQty) * price))
        const percent = item.quantity > 0 ? Math.min(100, Math.round((savedQty / item.quantity) * 100)) : 0
        return { target, saved: item.saved_amount, remaining, percent, ready }
    }

    const target = item.estimated_price && item.estimated_price > 0 ? item.estimated_price : null
    const ready = target !== null && item.saved_amount >= target
    return {
        target,
        saved: item.saved_amount,
        remaining: target === null ? null : Math.max(0, target - item.saved_amount),
        percent: target ? Math.min(100, Math.round((item.saved_amount / target) * 100)) : 0,
        ready,
    }
}

/** Urgent first, then the goal closest to done — the order money would reach them. */
export function sortWishes(items: WishListItem[]): WishListItem[] {
    return items.slice().sort((a, b) => {
        const p = PRIORITY_ORDER[a.priority ?? 'low'] - PRIORITY_ORDER[b.priority ?? 'low']
        if (p !== 0) return p
        const ra = wishProgress(a).remaining ?? Infinity
        const rb = wishProgress(b).remaining ?? Infinity
        return ra - rb
    })
}

export interface SavingsPace {
    /** Average income minus spending per closed period. */
    perPeriod: number
    /** Average closed period length in days. */
    periodDays: number
    perDay: number
    /** Closed periods the average is based on. */
    basedOn: number
}

/**
 * The user's savings capacity: what was left over (income minus spending) in the last
 * few closed periods. Open periods are skipped — early on, salary is in and little is
 * spent, which would promise far more than the period will really leave over.
 */
export function savingsPace(periods: PayPeriod[], summaries: Record<string, PeriodSummary>): SavingsPace | null {
    const recent = periods.filter(p => p.status === 'closed' && p.end_date && summaries[p.id])
    if (recent.length === 0) return null

    let unspent = 0
    let days = 0
    for (const p of recent) {
        unspent += summaries[p.id].unspent
        days += getDaysBetween(p.start_date, p.end_date!) + 1
    }
    if (days <= 0) return null

    return {
        perPeriod: unspent / recent.length,
        periodDays: days / recent.length,
        perDay: unspent / days,
        basedOn: recent.length,
    }
}

/** The recent closed periods whose summaries savingsPace needs. */
export function pacePeriods(periods: PayPeriod[]): PayPeriod[] {
    return periods
        .filter(p => p.status === 'closed' && p.end_date)
        .sort((a, b) => b.start_date.localeCompare(a.start_date))
        .slice(0, PACE_PERIODS)
}

export interface RoadmapStop {
    item: WishListItem
    /** Estimated date the goal is fully funded (YYYY-MM-DD), null when out of reach. */
    date: string | null
    /** Periods from today until then, rounded up. */
    periods: number | null
}

/**
 * When each goal would be funded if every period's leftover went to the wish list,
 * one goal at a time in `sortWishes` order. Goals without a price are left out;
 * ready goals land today.
 */
export function buildRoadmap(items: WishListItem[], pace: SavingsPace | null, today = toISODate()): RoadmapStop[] {
    let cumulative = 0
    const stops: RoadmapStop[] = []

    for (const item of sortWishes(items)) {
        const { remaining } = wishProgress(item)
        if (remaining === null) continue
        cumulative += remaining

        if (remaining === 0) {
            stops.push({ item, date: today, periods: 0 })
            continue
        }
        if (!pace || pace.perDay <= 0) {
            stops.push({ item, date: null, periods: null })
            continue
        }

        const days = Math.ceil(cumulative / pace.perDay)
        if (days > MAX_ETA_DAYS) {
            stops.push({ item, date: null, periods: null })
            continue
        }
        const date = new Date(today + 'T00:00:00')
        date.setDate(date.getDate() + days)
        stops.push({ item, date: toISODate(date), periods: Math.max(1, Math.ceil(days / pace.periodDays)) })
    }

    return stops
}

export function formatMonthYear(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/** Used to turn days into periods before any period has closed. */
const DEFAULT_PERIOD_DAYS = 30

export type TargetStatus = 'done' | 'on-track' | 'behind' | 'overdue' | 'unknown'

export interface TargetPlan {
    targetDate: string
    status: TargetStatus
    /** Days from today to the target date (negative once past). */
    daysLeft: number
    /** Periods left before the target date, at least 1. */
    periodsLeft: number
    /** What to set aside each period, for this wish alone, to have it by the date. */
    perPeriodNeeded: number
}

/**
 * How a dated wish stands against its "want it by" date. On track means the roadmap
 * (which funds urgent wishes first) reaches it in time; the per-period amount is what
 * this wish alone needs, so it's the number to act on either way.
 */
export function targetPlan(
    item: WishListItem,
    stop: RoadmapStop | undefined,
    pace: SavingsPace | null,
    today = toISODate(),
): TargetPlan | null {
    if (!item.target_date) return null
    const { remaining, ready } = wishProgress(item)
    if (remaining === null) return null

    const daysLeft = getDaysBetween(today, item.target_date)
    const periodDays = pace?.periodDays && pace.periodDays > 0 ? pace.periodDays : DEFAULT_PERIOD_DAYS
    const periodsLeft = Math.max(1, Math.ceil((daysLeft + 1) / periodDays))
    const perPeriodNeeded = ready ? 0 : remaining / periodsLeft

    let status: TargetStatus
    if (ready) status = 'done'
    else if (daysLeft < 0) status = 'overdue'
    else if (!stop?.date) status = pace && pace.perDay > 0 ? 'behind' : 'unknown'
    else status = stop.date <= item.target_date ? 'on-track' : 'behind'

    return { targetDate: item.target_date, status, daysLeft, periodsLeft, perPeriodNeeded }
}
