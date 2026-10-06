import { useMemo } from 'react'
import { useBills, usePeriods } from '@/queries'
import { billsForPeriod, periodWindow, reservedTotal, type BillDue, type PeriodWindow } from '@/features/bills/lib/bills'
import { toISODate } from '@/lib/helpers'
import type { PayPeriod, TransactionWithDetails } from '@/types'

export interface BillReserve {
    /** Bills due in the period or paid in it, unpaid soonest first. */
    dues: BillDue[]
    /** What's still due this period, held back from safe to spend. */
    reserved: number
    window: PeriodWindow | null
}

const NONE: BillReserve = { dues: [], reserved: 0, window: null }

/**
 * The open period's bills. A closed period is history, so nothing is reserved in it,
 * and until bills and transactions load the reserve is 0 rather than a guess.
 */
export function useBillReserve(
    period: Pick<PayPeriod, 'id' | 'start_date' | 'end_date' | 'status'> | null | undefined,
    transactions: TransactionWithDetails[] | undefined,
): BillReserve {
    const { data: bills } = useBills()
    const { periods } = usePeriods()

    return useMemo(() => {
        if (!period?.id || period.status !== 'active' || !bills || !transactions) return NONE
        const window = periodWindow(period, periods)
        const dues = billsForPeriod(bills, transactions, window, toISODate())
        return { dues, reserved: reservedTotal(dues), window }
    }, [period, periods, bills, transactions])
}
