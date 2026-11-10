import { MONTHS_LONG, MONTHS_SHORT } from './dates'

/**
 * The one name a pay period goes by, everywhere: the month it starts in, which is the month
 * of the payday that opened it. 10 Oct – 8 Nov is "October"; the one opened on payday 9 Nov
 * is "November". The year is added only when it isn't this year ("December 2025"), so the
 * same period never reads "Oct period" in one place and "Sep 2026" or "10 Sep 2026" in another.
 *
 * In a sentence say "the October period"; in a tight spot (a chip, a chart axis, a tile)
 * use the short form, "Oct" or "Dec 2025". Dates inside a period are a range, never its name:
 * see `periodRange` in features/periods/lib/period-progress.
 */

/** A period, or just its start date (YYYY-MM-DD), e.g. the payday a new one would open on. */
export type PeriodLike = { start_date: string } | string

const startOf = (period: PeriodLike) => (typeof period === 'string' ? period : period.start_date).slice(0, 10)

function name(period: PeriodLike, months: string[], today: string | undefined): string {
    const [y, m] = startOf(period).split('-').map(Number)
    const thisYear = today ? Number(today.slice(0, 4)) : new Date().getFullYear()
    const month = months[m - 1]
    return y === thisYear ? month : `${month} ${y}`
}

/** "October", or "December 2025" when it isn't this year (`today`'s, YYYY-MM-DD; default the local date). */
export function periodName(period: PeriodLike, today?: string): string {
    return name(period, MONTHS_LONG, today)
}

/** "Oct", or "Dec 2025" when it isn't this year: for chips, tiles and chart axes. */
export function periodShortName(period: PeriodLike, today?: string): string {
    return name(period, MONTHS_SHORT, today)
}
