import { useMemo } from 'react'
import { useBills, useDebts } from '@/queries'
import { toISODate } from '@/lib/helpers'
import type { BillReserve } from '@/hooks/use-bill-reserve'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { Account, PayPeriod } from '@/types'
import { buildCashOutlook, OUTLOOK_DAYS, type CashOutlook } from '../lib/cash-outlook'

/**
 * The next six weeks of the everyday accounts, for the open period only (a closed one has
 * no "from today"). Null until bills and debts are in: a line without them would look calm
 * for the wrong reason.
 */
export function useCashOutlook(
    period: Pick<PayPeriod, 'salary_amount' | 'status'> | undefined,
    accounts: Account[] | undefined,
    stats: PeriodStats,
    reserve: BillReserve,
): CashOutlook | null {
    const { data: bills } = useBills()
    const { data: debts } = useDebts({ activeOnly: true })

    return useMemo(() => {
        if (!period || period.status !== 'active' || !accounts || !bills || !debts || !reserve.window) return null
        return buildCashOutlook({
            today: toISODate(),
            days: OUTLOOK_DAYS,
            startBalance: accounts.filter(a => !a.is_savings).reduce((s, a) => s + a.balance, 0),
            dailyPace: stats.dailyAvg,
            bills,
            dues: reserve.dues,
            window: reserve.window,
            expectedIncome: period.salary_amount,
            debts,
        })
    }, [period, accounts, bills, debts, reserve, stats.dailyAvg])
}
