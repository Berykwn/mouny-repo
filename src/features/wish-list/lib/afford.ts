import { addDays, monthLabel } from '@/lib/dates'
import type { SavingsPace } from './wish-analytics'

/**
 * "Can I afford it?" in one verdict. Every branch rests on numbers the app already has:
 * what's safe to spend until payday, the usual everyday spending per day, and what past
 * periods usually left over. Without them it says it can't tell, rather than guess.
 */

/** Past this, a save-up date is too far out to mean anything. */
const MAX_DAYS = 365 * 10

export type AffordVerdict =
    /** Within safe to spend, and the days after it still cover the usual pace. */
    | { kind: 'yes'; perDayAfter: number; daysLeft: number | null; readyAround: null }
    /** Within safe to spend, but leaves less a day than is usually spent. */
    | { kind: 'tight'; perDayAfter: number; daysLeft: number; usualPerDay: number; readyAround: string | null }
    /** More than is safe now, but one usual leftover covers it. */
    | { kind: 'after-payday'; short: number; payday: string | null; leftover: number; readyAround: string | null }
    /** More than one period leaves over: save for it. */
    | { kind: 'save'; short: number; readyAround: string | null }
    /** No open period to judge against. */
    | { kind: 'unknown' }

export interface AffordInput {
    amount: number
    /** Safe to spend now, bills still due already held back; null without an open period. */
    safeToSpend: number | null
    /** Days left in the period, today included; null when the end isn't known. */
    daysLeft: number | null
    /** Everyday spending per day so far; null until there are enough days to tell. */
    usualPerDay: number | null
    pace: SavingsPace | null
    /** The day the next period starts, when known. */
    payday: string | null
    today: string
}

/** When the usual leftover adds up to the amount; null without a pace or past ten years. */
export function readyAround(amount: number, pace: SavingsPace | null, today: string): string | null {
    if (!pace || pace.perDay <= 0 || amount <= 0) return null
    const days = Math.ceil(amount / pace.perDay)
    return days > MAX_DAYS ? null : addDays(today, days)
}

/** "mid-December", "early March 2027": a save-up date said as loosely as it's known. */
export function aroundLabel(date: string, today: string): string {
    const d = Number(date.slice(8, 10))
    const part = d <= 10 ? 'early' : d <= 20 ? 'mid' : 'late'
    return `${part}-${monthLabel(date, today)}`
}

export function affordVerdict({ amount, safeToSpend, daysLeft, usualPerDay, pace, payday, today }: AffordInput): AffordVerdict {
    if (safeToSpend === null) return { kind: 'unknown' }
    const after = safeToSpend - amount
    const ready = readyAround(amount, pace, today)

    if (after >= 0) {
        const perDayAfter = daysLeft && daysLeft > 0 ? after / daysLeft : after
        if (daysLeft && usualPerDay && usualPerDay > 0 && perDayAfter < usualPerDay) {
            return { kind: 'tight', perDayAfter, daysLeft, usualPerDay, readyAround: ready }
        }
        return { kind: 'yes', perDayAfter, daysLeft, readyAround: null }
    }

    const short = -after
    if (pace && pace.perPeriod >= amount) {
        return { kind: 'after-payday', short, payday, leftover: pace.perPeriod, readyAround: ready }
    }
    return { kind: 'save', short, readyAround: ready }
}
