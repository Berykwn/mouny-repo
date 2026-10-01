import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { onTransactionsChanged } from '@/lib/transactions-bus'
import { transactionsService } from '@/services/transactions.service'
import { debtsService } from '@/services/debts.service'
import { wishListService } from '@/services/wish-list.service'
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
 * attention in debts and the wish list. Refreshed on navigation and whenever
 * transactions change; a failed query just leaves its part null.
 */
export function useMoneyGlance(period: PayPeriod | null): MoneyGlance {
    const location = useLocation()
    const [glance, setGlance] = useState<MoneyGlance>({ summary: null, debts: null, wishes: null })
    const [tick, setTick] = useState(0)

    useEffect(() => onTransactionsChanged(() => setTick(t => t + 1)), [])

    useEffect(() => {
        let cancelled = false
        Promise.all([
            period ? transactionsService.getPeriodSummary(period.id) : Promise.resolve({ data: null }),
            debtsService.getActive(),
            wishListService.getAll(),
        ]).then(([{ data: summary }, { data: debts }, { data: wishes }]) => {
            if (cancelled) return

            let debtGlance: DebtGlance | null = null
            if (debts) {
                debtGlance = { owed: 0, receivable: 0, open: debts.length, overdue: 0, dueSoon: 0 }
                for (const d of debts) {
                    if (d.type === 'debt') debtGlance.owed += d.remaining_amount
                    else debtGlance.receivable += d.remaining_amount
                    const s = dueStatus(d)
                    if (s.kind === 'overdue') debtGlance.overdue++
                    else if (s.kind === 'today' || s.kind === 'soon') debtGlance.dueSoon++
                }
            }

            setGlance({
                summary: summary ?? null,
                debts: debtGlance,
                wishes: wishes ? { count: wishes.length, ready: wishes.filter(w => wishProgress(w).ready).length } : null,
            })
        })
        return () => { cancelled = true }
    }, [period, location.pathname, tick])

    return glance
}
