import { useMemo } from 'react'
import { usePeriods, useTransactionsOfPeriods } from '@/queries'
import { paymentsByBill, type BillPayment } from '../lib/bill-history'

/** How many recent periods a bill's payment history reaches back. */
export const HISTORY_PERIODS = 6

/**
 * Bill payments over the last few periods, read from the shared transactions cache.
 * Null until they've loaded, so nothing says "no change" before it knows.
 */
export function useBillHistory(): Map<string, BillPayment[]> | null {
    const { periods } = usePeriods()
    // Periods come newest first.
    const ids = useMemo(() => periods.slice(0, HISTORY_PERIODS).map(p => p.id), [periods])
    const lists = useTransactionsOfPeriods(ids)
    return useMemo(() => (lists && ids.length > 0 ? paymentsByBill(lists) : null), [lists, ids.length])
}
