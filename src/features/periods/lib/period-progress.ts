import { getDaysBetween, toISODate } from '@/lib/helpers'
import type { PayPeriod } from '@/types'

export interface PeriodProgress {
    /** Today's day in the period, the first day being day 1 (the last day once it's closed). */
    day: number
    /** The period's length in days, or null while it's open and there's no earlier period to go by. */
    totalDays: number | null
    /** The end comes from the previous period's length, not from a close. */
    estimated: boolean
    /** An open period already longer than the previous one: payday is overdue, not "in 1 day". */
    pastUsualLength: boolean
    /** The last day, known or estimated (YYYY-MM-DD). */
    endDate: string | null
    /** Days until the next period would start (payday), or null without an end. */
    daysToPayday: number | null
    /** 0–1 of the period gone by, or null without an end. */
    fraction: number | null
}

/** A YYYY-MM-DD date moved by whole days, in local time. */
export function addDaysISO(date: string, days: number): string {
    const [y, m, d] = date.slice(0, 10).split('-').map(Number)
    return toISODate(new Date(y, m - 1, d + days))
}

const inclusiveDays = (start: string, end: string) => getDaysBetween(start, end) + 1

/** The closed period just before this one, whose length an open period is expected to repeat. */
function previousClosed(period: PayPeriod, periods: PayPeriod[]): PayPeriod | null {
    return periods
        .filter(p => p.id !== period.id && p.status === 'closed' && p.end_date && p.start_date < period.start_date)
        .sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null
}

/**
 * Where a period stands today: its day, its length and the days to payday. An open period has
 * no end date yet, so it's read off the previous period's length, the same base the dashboard's
 * projections use; without one the length stays unknown rather than made up.
 */
export function periodProgress(period: PayPeriod, periods: PayPeriod[], today: string = toISODate()): PeriodProgress {
    if (period.end_date) {
        const totalDays = inclusiveDays(period.start_date, period.end_date)
        const day = Math.min(totalDays, Math.max(1, inclusiveDays(period.start_date, today)))
        const closed = period.status === 'closed'
        return {
            day: closed ? totalDays : day,
            totalDays,
            estimated: false,
            pastUsualLength: false,
            endDate: period.end_date,
            daysToPayday: closed ? 0 : Math.max(0, totalDays - day + 1),
            fraction: closed ? 1 : day / totalDays,
        }
    }

    const day = Math.max(1, inclusiveDays(period.start_date, today))
    const prev = previousClosed(period, periods)
    if (!prev?.end_date) {
        return { day, totalDays: null, estimated: false, pastUsualLength: false, endDate: null, daysToPayday: null, fraction: null }
    }
    // Running past the usual length doesn't make the period longer; it just ends any day now.
    const usualDays = inclusiveDays(prev.start_date, prev.end_date)
    const totalDays = Math.max(day, usualDays)
    return {
        day,
        totalDays,
        estimated: true,
        pastUsualLength: day > usualDays,
        endDate: addDaysISO(period.start_date, totalDays - 1),
        daysToPayday: totalDays - day + 1,
        fraction: day / totalDays,
    }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * When payday is, in words, hedged when it's only estimated: "payday in 6 days",
 * "payday in about 6 days", "payday likely tomorrow", or "past your usual length" once an
 * open period outruns the last one. Null when there's nothing to say (closed, or no end).
 */
export function paydayLabel(progress: PeriodProgress): string | null {
    if (progress.pastUsualLength) return 'past your usual length'
    const n = progress.daysToPayday
    if (!n) return null
    if (n === 1) return progress.estimated ? 'payday likely tomorrow' : 'payday tomorrow'
    return progress.estimated ? `payday in about ${plural(n, 'day')}` : `payday in ${plural(n, 'day')}`
}

/** "Day 25 of 30", "Day 25 of about 30", or just "Day 34" when the length is unknown or outrun. */
export function periodDayLabel(progress: PeriodProgress): string {
    if (progress.totalDays === null || progress.pastUsualLength) return `Day ${progress.day}`
    return `Day ${progress.day} of ${progress.estimated ? 'about ' : ''}${progress.totalDays}`
}

// Spelled out here: en-GB's short September is "Sept" on some ICU versions and "Sep" on others.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const parts = (date: string) => date.slice(0, 10).split('-').map(Number)

const dayMonth = (date: string) => {
    const [, m, d] = parts(date)
    return `${d} ${MONTHS[m - 1]}`
}

/** "25 Sep – 24 Oct", "25 Sep – about 24 Oct" for an estimated end, or "From 25 Sep" without an end. */
export function periodRange(start: string, end: string | null, estimated = false): string {
    return end ? `${dayMonth(start)} – ${estimated ? 'about ' : ''}${dayMonth(end)}` : `From ${dayMonth(start)}`
}

/**
 * A period's name: the month it pays for, which is the month it ends in ("October" for
 * 25 Sep – 24 Oct). With no end in sight, the month it started in.
 */
export function periodMonth(start: string, end: string | null, withYear = false): string {
    const [y, m] = parts(end ?? start)
    if (withYear) return `${MONTHS[m - 1]} ${y}`
    return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })
}
