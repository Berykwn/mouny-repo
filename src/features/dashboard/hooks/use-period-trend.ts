import { useEffect, useState } from 'react'
import { transactionsService } from '@/services/transactions.service'
import { formatPeriodLabel } from '@/lib/helpers'
import { summarizeTransactions, EMPTY_PERIOD_SUMMARY, type PeriodSummary } from '@/lib/period-summary'
import type { PayPeriod, TransactionWithDetails } from '@/types'

export interface TrendPoint {
    periodId: string
    label: string
    income: number
    expense: number
    net: number
    /** Income minus spending (savings not counted as spent) — what periods are ranked by. */
    unspent: number
    isCurrent: boolean
}

const MAX_PERIODS = 6

/**
 * Builds a chronological (oldest → newest) trend series across the most recent
 * pay periods. The selected period's numbers come from its already-loaded
 * transactions (no refetch); every other period is fetched in a single batched
 * summary query.
 */
export function usePeriodTrend(
    periods: PayPeriod[],
    selectedPeriod: PayPeriod | null,
    selectedTransactions: TransactionWithDetails[],
): { trend: TrendPoint[]; loading: boolean } {
    const [otherSummaries, setOtherSummaries] = useState<Record<string, PeriodSummary>>({})
    const [loading, setLoading] = useState(false)

    const recentPeriods = [...periods]
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(-MAX_PERIODS)

    const otherPeriodIds = recentPeriods
        .filter(p => p.id !== selectedPeriod?.id)
        .map(p => p.id)
        .join(',')

    useEffect(() => {
        const ids = otherPeriodIds ? otherPeriodIds.split(',') : []
        if (ids.length === 0) {
            setOtherSummaries({})
            return
        }
        let cancelled = false
        setLoading(true)
        transactionsService.getPeriodSummaries(ids).then(({ data }) => {
            // A newer selection's request owns the state now.
            if (cancelled) return
            setOtherSummaries(data ?? {})
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [otherPeriodIds])

    if (!selectedPeriod) return { trend: [], loading: false }

    const selectedSummary = summarizeTransactions(selectedTransactions)

    const trend: TrendPoint[] = recentPeriods.map(p => {
        const isSelected = p.id === selectedPeriod.id
        const summary = isSelected
            ? selectedSummary
            : otherSummaries[p.id] ?? EMPTY_PERIOD_SUMMARY

        return {
            periodId: p.id,
            label: formatPeriodLabel(p.start_date),
            income: summary.income,
            expense: summary.expense,
            net: summary.net,
            unspent: summary.unspent,
            // Still open (no end_date) — its numbers will keep moving, unlike a closed period.
            isCurrent: p.end_date === null,
        }
    })

    return { trend, loading }
}
