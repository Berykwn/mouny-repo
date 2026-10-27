import { useCallback } from 'react'
import { useQueries, type UseQueryResult } from '@tanstack/react-query'
import { queryKeys } from '@/queries'
import { debtsService, type DebtPaymentWithAccount } from '@/services/debts.service'
import type { DebtWithAccount } from '@/types'

/**
 * What each dated debt you owe has been paid since `periodStart`, from its dated payments
 * (the same cache entries useDebtPayments reads). Only dated debts have a per-period share,
 * so only theirs are loaded. Null until they have, or without an open period; a failed load
 * (e.g. no payment history yet) counts as nothing paid.
 */
export function usePaidThisPeriod(debts: DebtWithAccount[], periodStart: string | null | undefined): Record<string, number> | null {
    const ids = periodStart
        ? debts.filter(d => d.type === 'debt' && d.status === 'active' && d.due_date).map(d => d.id)
        : []

    // Stable while the ids are, so the combined result keeps its identity between renders.
    const key = ids.join(',')
    const combine = useCallback((results: UseQueryResult<DebtPaymentWithAccount[]>[]) => {
        if (!periodStart || results.some(r => r.isPending)) return null
        const order = key ? key.split(',') : []
        const paid: Record<string, number> = {}
        results.forEach((r, i) => {
            paid[order[i]] = (r.data ?? []).filter(p => p.date.slice(0, 10) >= periodStart).reduce((s, p) => s + p.amount, 0)
        })
        return paid
    }, [periodStart, key])

    return useQueries({
        queries: ids.map(id => ({
            queryKey: queryKeys.debtPayments(id),
            queryFn: async () => {
                const { data, error } = await debtsService.getPayments(id)
                if (error) throw new Error(error)
                return data ?? []
            },
        })),
        combine,
    })
}
