import { usePeriodSummaries } from '@/queries'
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
 * transactions, so it moves as soon as they do; the rest come from one batched,
 * cached summary query.
 */
export function usePeriodTrend(
    periods: PayPeriod[],
    selectedPeriod: PayPeriod | null,
    selectedTransactions: TransactionWithDetails[],
): { trend: TrendPoint[]; loading: boolean } {
    const recentPeriods = [...periods]
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(-MAX_PERIODS)

    // Summaries for all recent periods at once: the cache key doesn't change when you
    // pick another period among them, so switching doesn't refetch.
    const { data: summaries, isLoading: loading } = usePeriodSummaries(recentPeriods.map(p => p.id))
    const otherSummaries: Record<string, PeriodSummary> = summaries ?? {}

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
