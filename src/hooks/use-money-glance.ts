import { useMemo } from 'react'
import { useDebts, usePeriodSummary, usePeriodTransactions, useWishes } from '@/queries'
import { useBillReserve } from './use-bill-reserve'
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

export interface BillGlance {
    /** Bills with a due date still unpaid this period. */
    due: number
    overdue: number
    reserved: number
}

export interface MoneyGlance {
    summary: PeriodSummary | null
    /** What's left this period after bills still due: the dashboard's safe to spend. */
    left: number | null
    bills: BillGlance | null
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
    const { data: periodTxs } = usePeriodTransactions(period?.id)
    const reserve = useBillReserve(period, periodTxs)

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

    const billGlance = useMemo((): BillGlance | null => (
        reserve.window ? {
            due: reserve.dues.filter(d => d.outstanding > 0).length,
            overdue: reserve.dues.filter(d => d.status === 'overdue').length,
            reserved: reserve.reserved,
        } : null
    ), [reserve])

    return {
        summary: summary ?? null,
        left: summary ? summary.net - reserve.reserved : null,
        bills: billGlance,
        debts: debtGlance,
        wishes: wishGlance,
    }
}
