import { useMemo } from 'react'
import { getDaysBetween } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'

interface UsePeriodStatsParams {
    period: { start_date: string; end_date: string | null; status?: string }
    transactions: TransactionWithDetails[]
    fallbackTotalDays?: number | null
}

export interface PeriodStats {
    totalIncome: number
    /** Every expense, savings included — what actually left the accounts. */
    totalExpense: number
    /** Expenses in savings categories: set aside, not spent. */
    totalSavings: number
    /** Expenses minus savings — the base for pace, projections and no-spend days. */
    totalSpending: number
    remaining: number
    spentPercent: number
    daysElapsed: number
    totalDays: number | null
    daysRemaining: number | null
    dailyAvg: number
    safeDaily: number | null
    projectedSpend: number | null
    projectedClose: number | null
    runwayDays: number | null
    noSpendDays: number
    isEndDateEstimated: boolean
    /** Closed periods are history: nothing left to project, pace against, or run out of. */
    isClosed: boolean
}

/** Days of data needed before pace is extrapolated into projections. */
const MIN_PROJECTION_DAYS = 3

/** Calendar days from start to end, both counted (a period's first day is day 1). */
function inclusiveDays(start: string, end?: string) {
    return getDaysBetween(start, end) + 1
}

/**
 * Pure, useMemo-based derived stats for a pay period. No fetching — caller
 * supplies the period bounds and its transactions. `null` fields mean
 * "not enough data to compute this," never coerced to 0 — consumers must
 * treat null as "hide this part of the UI."
 */
export function usePeriodStats({
    period,
    transactions,
    fallbackTotalDays = null,
}: UsePeriodStatsParams): PeriodStats {
    return useMemo(() => {
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((s, t) => s + t.amount, 0)
        const expenses = transactions.filter(t => t.type === 'expense')
        const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
        // Savings leave the account but aren't spending, so pace-based numbers ignore them.
        const spending = expenses.filter(t => !t.category?.is_savings)
        const totalSpending = spending.reduce((s, t) => s + t.amount, 0)
        const totalSavings = totalExpense - totalSpending

        const remaining = totalIncome - totalExpense
        const spentPercent = totalIncome > 0
            ? Math.min(Math.round((totalExpense / totalIncome) * 100), 100)
            : 0

        const isClosed = period.status === 'closed'

        let totalDays: number | null = null
        let isEndDateEstimated = false
        if (period.end_date) {
            totalDays = inclusiveDays(period.start_date, period.end_date)
        } else if (fallbackTotalDays !== null && fallbackTotalDays !== undefined) {
            totalDays = fallbackTotalDays
            isEndDateEstimated = true
        }

        // Count days up to today for an open period, but stop at the end for a closed one —
        // otherwise every day since it closed would pile up as an extra "no-spend" day.
        const lastTxDate = transactions.reduce<string | null>((max, t) => (!max || t.date > max ? t.date : max), null)
        const asOf = isClosed ? (period.end_date ?? lastTxDate ?? period.start_date) : undefined
        const daysElapsed = Math.max(1, Math.min(
            inclusiveDays(period.start_date, asOf),
            totalDays ?? Infinity
        ))

        const daysRemaining = isClosed ? 0 : totalDays !== null ? Math.max(0, totalDays - daysElapsed) : null

        const dailyAvg = totalSpending / daysElapsed

        // daysRemaining excludes today, but today's budget is still spendable.
        const safeDaily = !isClosed && daysRemaining !== null
            ? remaining / (daysRemaining + 1)
            : null

        // A day or two of data is too thin to extrapolate — one big purchase would read as the pace.
        const canProject = !isClosed && daysElapsed >= MIN_PROJECTION_DAYS
        // Savings already made stay as they are; only spending is assumed to keep its pace.
        const projectedSpend = canProject && totalDays !== null && daysRemaining !== null
            ? totalExpense + dailyAvg * daysRemaining
            : null
        const projectedClose = projectedSpend !== null ? totalIncome - projectedSpend : null

        const runwayDays = canProject && dailyAvg > 0 ? Math.floor(remaining / dailyAvg) : null

        const distinctExpenseDates = new Set(
            spending.map(t => t.date.slice(0, 10))
        )
        const noSpendDays = Math.max(0, daysElapsed - distinctExpenseDates.size)

        return {
            totalIncome,
            totalExpense,
            totalSavings,
            totalSpending,
            remaining,
            spentPercent,
            daysElapsed,
            totalDays,
            daysRemaining,
            dailyAvg,
            safeDaily,
            projectedSpend,
            projectedClose,
            runwayDays,
            noSpendDays,
            isEndDateEstimated,
            isClosed,
        }
    }, [period.start_date, period.end_date, period.status, transactions, fallbackTotalDays])
}
