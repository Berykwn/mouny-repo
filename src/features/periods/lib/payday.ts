import { addDays } from '@/lib/dates'
import { getDaysBetween, toISODate } from '@/lib/helpers'
import { periodName } from '@/lib/period-name'
import { periodWindow } from '@/features/bills/lib/bills'
import type { PayPeriod } from '@/types'

export interface PaydayDue {
    /** The running period's name, e.g. "October". */
    current: string
    /** The name of the period payday starts: today's month, the pay date the open form starts on. */
    next: string
    /** The day payday was expected (YYYY-MM-DD): the day after the period's known or usual end. */
    expected: string
    /** Days since that payday; 0 on payday itself. */
    daysLate: number
}

/**
 * Whether payday has come for the running period, so it's time to close it and start the
 * next one. An open period's end is the same estimate Plan's "Next period about …" uses (as
 * long as the period before it, or a month for the very first), so the prompt shows on the
 * day Plan says the next period starts, and not a day before. Null for no period, a closed
 * one, or when payday is still ahead.
 */
export function paydayDue(period: PayPeriod | null, periods: PayPeriod[], today: string = toISODate()): PaydayDue | null {
    if (!period || period.status === 'closed') return null
    // periodWindow reads the period before from the next entry, so newest first.
    const newestFirst = [...periods].sort((a, b) => b.start_date.localeCompare(a.start_date))
    const { end } = periodWindow(period, newestFirst)
    const expected = addDays(end, 1)
    if (today < expected) return null
    return {
        current: periodName(period, today),
        next: periodName(today, today),
        expected,
        daysLate: getDaysBetween(expected, today),
    }
}

const SNOOZE_KEY = 'mouny-payday-snooze'

/** "Not paid yet": the prompt for this period stays away for the rest of `today`. */
export function snoozePayday(periodId: string, today: string = toISODate()): void {
    try {
        localStorage.setItem(SNOOZE_KEY, JSON.stringify({ periodId, until: today }))
    } catch { /* private mode or blocked storage: it just shows again */ }
}

/** Whether the prompt for this period was put off today. */
export function paydaySnoozed(periodId: string, today: string = toISODate()): boolean {
    try {
        const raw = localStorage.getItem(SNOOZE_KEY)
        if (!raw) return false
        const { periodId: id, until } = JSON.parse(raw) as { periodId?: string; until?: string }
        return id === periodId && until === today
    } catch {
        return false
    }
}
