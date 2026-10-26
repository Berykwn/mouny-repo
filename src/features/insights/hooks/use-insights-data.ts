import { useMemo } from 'react'
import { useTransactionsOfPeriods } from '@/queries'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { comparableSpending } from '@/lib/comparable-spending'
import { useOverviewData } from '@/features/dashboard/hooks/use-overview-data'
import { useCashOutlook } from '@/features/dashboard/hooks/use-cash-outlook'
import { usePeriodTrend } from '@/features/dashboard/hooks/use-period-trend'
import { USUAL_PERIODS, type PastPeriod } from '../lib/analysis'

/**
 * Everything Insights reads for one period, worked out once so every tab agrees: the
 * period itself, its stats, and the closed periods before it that "your usual" comes from.
 */
export function useInsightsData(periodId: string) {
    const overview = useOverviewData(periodId)
    const { data } = overview
    const reserve = useBillReserve(data?.period, data?.transactions)
    const stats = usePeriodStats({
        period: data?.period ?? { start_date: '', end_date: null },
        transactions: data?.transactions ?? [],
        fallbackTotalDays: data?.fallbackTotalDays ?? null,
        reservedBills: reserve.reserved,
    })
    const comparable = comparableSpending(stats)

    // Periods are newest first, so the earlier ones follow this one.
    const earlier = useMemo(() => {
        if (!data) return []
        const index = data.allPeriods.findIndex(p => p.id === data.period.id)
        return index >= 0 ? data.allPeriods.slice(index + 1).filter(p => p.status === 'closed').slice(0, USUAL_PERIODS) : []
    }, [data])
    const earlierTxs = useTransactionsOfPeriods(earlier.map(p => p.id))
    /** Null while the earlier periods load; empty when there are none. */
    const history = useMemo((): PastPeriod[] | null => (
        earlierTxs ? earlier.map((p, i) => ({ start_date: p.start_date, end_date: p.end_date, transactions: earlierTxs[i] })) : null
    ), [earlier, earlierTxs])

    const outlook = useCashOutlook(data?.period, data?.accounts, stats, reserve)
    const trend = usePeriodTrend(data?.allPeriods ?? [], data?.period ?? null, data?.transactions ?? [])

    return { ...overview, reserve, stats, comparable, history, outlook, trend }
}

export type InsightsData = ReturnType<typeof useInsightsData>
