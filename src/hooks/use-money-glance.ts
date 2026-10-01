import { useMemo } from 'react'
import { useDebts, usePeriodSummary, useWishes } from '@/queries'
import { dueStatus } from '@/features/debts/lib/debt-insights'
import { wishProgress } from '@/features/wish-list/lib/wish-analytics'
import type { PeriodSummary } from '@/lib/period-summary'
import type { PayPeriod } from '@/types'

export interface DebtGlance {
    owed: number
    receivable: number
    open: number
    overdue: number
    /** Due today or within the week. */
    dueSoon: number
}

export interface WishGlance {
    count: number
    ready: number
}

export interface MoneyGlance {
    summary: PeriodSummary | null
    debts: DebtGlance | null
    wishes: WishGlance | null
}

/**
 * The few numbers worth seeing from anywhere — this period's money, and what needs
 * attention in debts and the wish list. Read from the shared cache, so it follows
 * every write; a failed query just leaves its part null.
 */
export function useMoneyGlance(period: PayPeriod | null): MoneyGlance {
    const { data: summary } = usePeriodSummary(period?.id)
    const { data: debts } = useDebts({ activeOnly: true })
    const { data: wishes } = useWishes()

    const debtGlance = useMemo((): DebtGlance | null => {
        if (!debts) return null
        const glance = { owed: 0, receivable: 0, open: debts.length, overdue: 0, dueSoon: 0 }
        for (const d of debts) {
            if (d.type === 'debt') glance.owed += d.remaining_amount
            else glance.receivable += d.remaining_amount
            const s = dueStatus(d)
            if (s.kind === 'overdue') glance.overdue++
            else if (s.kind === 'today' || s.kind === 'soon') glance.dueSoon++
        }
        return glance
    }, [debts])

    const wishGlance = useMemo((): WishGlance | null => (
        wishes ? { count: wishes.length, ready: wishes.filter(w => wishProgress(w).ready).length } : null
    ), [wishes])

    return { summary: summary ?? null, debts: debtGlance, wishes: wishGlance }
}
