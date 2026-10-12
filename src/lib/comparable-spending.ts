import { MIN_PROJECTION_DAYS, type PeriodStats } from '@/hooks/use-period-stats'

export interface ComparableSpending {
    /** Expenses minus savings, for the whole period. */
    spending: number
    /** spending is where the current pace ends the period, not what's spent so far. */
    projected: boolean
}

/**
 * This period's spending in a form that can stand against a finished period's total.
 * Mid-period, spending so far against last period's full total reads as "down" every
 * time, so an open period counts where its pace ends it. Null in the first days, when
 * there's too little to tell.
 */
export function comparableSpending(
    stats: Pick<PeriodStats, 'isClosed' | 'projectedSpend' | 'totalSavings' | 'totalSpending' | 'reservedBills' | 'daysElapsed'>
): ComparableSpending | null {
    if (stats.isClosed) return { spending: stats.totalSpending, projected: false }
    // projectedSpend counts savings already made; the comparison is spending against spending.
    if (stats.projectedSpend !== null) return { spending: stats.projectedSpend - stats.totalSavings, projected: true }
    if (stats.daysElapsed < MIN_PROJECTION_DAYS) return null
    // No end date to project to: bills still due are known, the rest is so far.
    return { spending: stats.totalSpending + stats.reservedBills, projected: false }
}

/** Percent change from a previous amount, or null when there's nothing to compare with. */
export function diffPct(current: number, previous: number | null | undefined): number | null {
    return previous && previous > 0 ? Math.round(((current - previous) / previous) * 100) : null
}
