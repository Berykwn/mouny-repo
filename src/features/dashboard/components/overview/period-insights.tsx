import { useMemo } from 'react'
import { useBills, usePeriods, useTransactionsOfPeriods } from '@/queries'
import { billCosts, type BillDue } from '@/features/bills/lib/bills'
import { toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { PayPeriod, TransactionWithDetails } from '@/types'
import { generateInsights, type InsightTone, type PastPeriod } from '../../lib/insights'

const TONE_CLASSES: Record<InsightTone, string> = {
    warning: 'border-warning text-warning',
    positive: 'border-brand text-positive',
    info: 'border-info text-info',
    neutral: 'border-line text-muted-ink',
}

/** How many earlier periods "your usual" is drawn from. */
const HISTORY_PERIODS = 3

interface PeriodInsightsProps {
    period: Pick<PayPeriod, 'id' | 'start_date'>
    transactions: TransactionWithDetails[]
    stats: PeriodStats
    dues: BillDue[]
}

export function PeriodInsights({ period, transactions, stats, dues }: PeriodInsightsProps) {
    const { periods } = usePeriods()
    const { data: bills } = useBills()

    // Periods are newest first, so the earlier ones follow this one.
    const earlier = useMemo(() => {
        const index = periods.findIndex(p => p.id === period.id)
        return index >= 0 ? periods.slice(index + 1, index + 1 + HISTORY_PERIODS) : []
    }, [periods, period.id])
    const earlierTxs = useTransactionsOfPeriods(earlier.map(p => p.id))

    const insights = useMemo(() => {
        const today = toISODate()
        // Comparisons wait for history; the rest shows straight away.
        const history: PastPeriod[] = earlierTxs ? earlier.map((p, i) => ({ start_date: p.start_date, transactions: earlierTxs[i] })) : []
        return generateInsights({
            today,
            periodStart: period.start_date,
            stats,
            transactions,
            history,
            dues,
            subscriptionsPerYear: bills ? billCosts(bills, today).subscriptionsPerYear : 0,
        })
    }, [earlier, earlierTxs, period.start_date, stats, transactions, dues, bills])

    return (
        <div className="rounded-[20px] border border-line bg-surface px-5 py-4 space-y-2.5">
            {insights.map(insight => (
                <p key={insight.id} className={cn('border-l-2 pl-3 text-[13px] leading-relaxed', TONE_CLASSES[insight.tone])}>
                    {insight.text}
                </p>
            ))}
        </div>
    )
}
