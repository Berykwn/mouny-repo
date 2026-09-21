import { useMemo } from 'react'
import { getDaysBetween, toISODate } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'

interface UsePeriodStatsParams {
    period: { start_date: string; end_date: string | null }
    transactions: TransactionWithDetails[]
    fallbackTotalDays?: number | null
}

export interface PeriodStats {
    totalIncome: number
    totalExpense: number
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
        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((s, t) => s + t.amount, 0)

        const remaining = totalIncome - totalExpense
        const spentPercent = totalIncome > 0
            ? Math.min(Math.round((totalExpense / totalIncome) * 100), 100)
            : 0

        const daysElapsed = Math.max(1, getDaysBetween(period.start_date))

        let totalDays: number | null = null
        let isEndDateEstimated = false
        if (period.end_date) {
            totalDays = getDaysBetween(period.start_date, period.end_date)
        } else if (fallbackTotalDays !== null && fallbackTotalDays !== undefined) {
            totalDays = fallbackTotalDays
            isEndDateEstimated = true
        }

        const daysRemaining = totalDays !== null ? Math.max(0, totalDays - daysElapsed) : null

        const dailyAvg = totalExpense / daysElapsed

        const safeDaily = daysRemaining !== null && daysRemaining > 0
            ? remaining / daysRemaining
            : null

        const projectedSpend = totalDays !== null ? dailyAvg * totalDays : null
        const projectedClose = totalDays !== null && projectedSpend !== null
            ? totalIncome - projectedSpend
            : null

        const runwayDays = dailyAvg > 0 ? Math.floor(remaining / dailyAvg) : null

        const distinctExpenseDates = new Set(
            transactions
                .filter(t => t.type === 'expense')
                .map(t => toISODate(new Date(t.date)))
        )
        const noSpendDays = Math.max(0, daysElapsed - distinctExpenseDates.size)

        return {
            totalIncome,
            totalExpense,
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
        }
    }, [period.start_date, period.end_date, transactions, fallbackTotalDays])
}
