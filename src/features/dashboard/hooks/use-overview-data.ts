import { useMemo } from 'react'
import { useAccounts, useDebts, usePeriods, usePeriodSummary, usePeriodTransactions } from '@/queries'
import { getDaysBetween } from '@/lib/helpers'
import type { OverviewData } from '@/types/overview.types'

/**
 * Everything the overview shows for one period, put together from the shared cache.
 * Each part refetches on its own after a write, and a failed background refetch keeps
 * the last data on screen.
 */
export function useOverviewData(
    periodId: string,
    /** The previous period's totals feed Insights' health score; Home doesn't fetch them. */
    { withPrevious = false }: { withPrevious?: boolean } = {},
): { data: OverviewData | null; loading: boolean; debtsFailed: boolean; retry: () => void } {
    const periodsQuery = usePeriods()
    const txsQuery = usePeriodTransactions(periodId)
    const accountsQuery = useAccounts()
    const debtsQuery = useDebts({ activeOnly: true })

    const allList = periodsQuery.periods
    // Periods are sorted by start_date descending, so the period immediately
    // before this one (chronologically) is the next entry in the list.
    const currentIndex = allList.findIndex(p => p.id === periodId)
    const currentPeriod = allList[currentIndex] ?? null
    const prevPeriod = currentIndex >= 0 ? allList[currentIndex + 1] ?? null : null
    const previousQuery = usePeriodSummary(withPrevious ? prevPeriod?.id : undefined)

    const data = useMemo((): OverviewData | null => {
        const periodTxs = txsQuery.data
        const accountsList = accountsQuery.data
        // Missing data would render as a believable Rp0 period, so treat it as a failed load.
        if (!currentPeriod || !periodTxs || !accountsList) return null

        const fallbackTotalDays = prevPeriod?.start_date && prevPeriod?.end_date
            ? getDaysBetween(prevPeriod.start_date, prevPeriod.end_date) + 1
            : null

        return {
            transactions: periodTxs,
            accounts: accountsList,
            closingBalance: currentPeriod.closing_balance ?? null,
            period: currentPeriod,
            fallbackTotalDays,
            allPeriods: allList,
            previousSummary: previousQuery.data ?? null,
            totalBalance: accountsList.reduce((s, a) => s + a.balance, 0),
            // Receivables are money owed to the user, not debt. Unknown until debts load:
            // counting it as 0 would show a "No debt" health score.
            totalDebt: debtsQuery.data
                ? debtsQuery.data.filter(d => d.type === 'debt').reduce((s, d) => s + d.remaining_amount, 0)
                : null,
        }
    }, [txsQuery.data, accountsQuery.data, debtsQuery.data, previousQuery.data, currentPeriod, prevPeriod, allList])

    const loading = periodsQuery.isPending || txsQuery.isPending || accountsQuery.isPending
    const retry = () => {
        void periodsQuery.refetch()
        void txsQuery.refetch()
        void accountsQuery.refetch()
        void debtsQuery.refetch()
    }
    // Debts only feed the health score, so their failure shows there, not as a failed page.
    const debtsFailed = debtsQuery.isError && !debtsQuery.data
    return { data, loading, debtsFailed, retry }
}
