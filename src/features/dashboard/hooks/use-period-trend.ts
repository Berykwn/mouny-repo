import { usePeriodSummaries } from '@/queries'
import { formatPeriodLabel } from '@/lib/helpers'
import { summarizeTransactions } from '@/lib/period-summary'
import type { PayPeriod, TransactionWithDetails } from '@/types'

export interface TrendPoint {
    periodId: string
    label: string
    income: number
    /** Every expense, savings included. */
    expense: number
    /** The part of expense that was set aside, not spent. */
    savings: number
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
): { trend: TrendPoint[]; loading: boolean; failed: boolean; retry: () => void } {
    const recentPeriods = [...periods]
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(-MAX_PERIODS)

    // Summaries for all recent periods at once: the cache key doesn't change when you
    // pick another period among them, so switching doesn't refetch.
    const { data: summaries, isLoading: loading, isError, refetch } = usePeriodSummaries(recentPeriods.map(p => p.id))
    // A failed background refetch keeps the last summaries, so only a failure with none is one.
    const failed = isError && !summaries
    const retry = () => { void refetch() }

    if (!selectedPeriod) return { trend: [], loading: false, failed: false, retry }

    const selectedSummary = summarizeTransactions(selectedTransactions)

    // The service fills every period it was asked for, so a missing one hasn't loaded:
    // leave it out rather than chart (and rank against) a believable Rp0 period.
    const trend: TrendPoint[] = recentPeriods.flatMap(p => {
        const summary = p.id === selectedPeriod.id ? selectedSummary : summaries?.[p.id]
        if (!summary) return []
        return [{
            periodId: p.id,
            label: formatPeriodLabel(p.start_date),
            income: summary.income,
            expense: summary.expense,
            savings: summary.savings,
            net: summary.net,
            unspent: summary.unspent,
            // Still open (no end_date) — its numbers will keep moving, unlike a closed period.
            isCurrent: p.end_date === null,
        }]
    })

    return { trend, loading, failed, retry }
}
