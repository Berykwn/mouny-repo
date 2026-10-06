/**
 * Server data, read through one shared cache. Every page and form reads through these
 * hooks instead of fetching on mount, so moving between pages doesn't refetch what's
 * already there, and two components asking for the same thing share one request.
 * Writes go through the services, which refresh the cache when they succeed
 * (see invalidatesOnWrite).
 */
import { queryOptions, useQuery } from '@tanstack/react-query'
import { accountsService, categoriesService } from '@/services/accounts-categories.service'
import { categoryBudgetsService } from '@/services/budgets.service'
import { debtsService } from '@/services/debts.service'
import { recurringBillsService } from '@/services/recurring-bills.service'
import { payPeriodsService } from '@/services/pay-periods.service'
import { transactionsService } from '@/services/transactions.service'
import { wishListService } from '@/services/wish-list.service'
import type { ServiceResult } from '@/services/_base'
import { pacePeriods, savingsPace, type SavingsPace } from '@/features/wish-list/lib/wish-analytics'
import type { Category, PayPeriod } from '@/types'

export const queryKeys = {
    periods: ['periods'] as const,
    accounts: ['accounts'] as const,
    archivedAccounts: ['accounts', 'archived'] as const,
    categories: ['categories'] as const,
    budgets: ['budgets'] as const,
    bills: ['bills'] as const,
    debts: ['debts'] as const,
    debtPayments: (debtId: string) => ['debts', debtId, 'payments'] as const,
    wishes: ['wishes'] as const,
    purchasedWishes: ['wishes', 'purchased'] as const,
    transactions: (periodId: string) => ['transactions', periodId] as const,
    summaries: (periodIds: string[]) => ['summaries', ...[...periodIds].sort()] as const,
}

/** Services report failures as `{ error }`; queries need them thrown. */
async function unwrap<T>(request: Promise<ServiceResult<T>>): Promise<T> {
    const { data, error } = await request
    if (error) throw new Error(error)
    return data as T
}

const EMPTY: never[] = []

/** Every pay period, newest first, and the open one among them. */
export function usePeriods() {
    const query = useQuery({
        queryKey: queryKeys.periods,
        queryFn: () => unwrap(payPeriodsService.getAll()),
    })
    const periods: PayPeriod[] = query.data ?? EMPTY
    return {
        ...query,
        periods,
        activePeriod: periods.find(p => p.status === 'active') ?? null,
    }
}

export const accountsQuery = queryOptions({
    queryKey: queryKeys.accounts,
    queryFn: () => unwrap(accountsService.getAll()),
})

export function useAccounts() {
    return useQuery(accountsQuery)
}

export function useArchivedAccounts() {
    return useQuery({
        queryKey: queryKeys.archivedAccounts,
        queryFn: () => unwrap(accountsService.getArchived()),
    })
}

export const categoriesQuery = queryOptions({
    queryKey: queryKeys.categories,
    queryFn: () => unwrap(categoriesService.getAll()),
})

/** All categories, or one type's; the filtered list shares the one cached request. */
export function useCategories(type?: Category['type'] | null) {
    return useQuery({
        ...categoriesQuery,
        select: type ? (all: Category[]) => all.filter(c => c.type === type) : undefined,
    })
}

export function useBudgets() {
    return useQuery({
        queryKey: queryKeys.budgets,
        queryFn: () => unwrap(categoryBudgetsService.getAll()),
    })
}

/** Recurring bills and subscriptions, paused and ended ones included. */
export function useBills() {
    return useQuery({
        queryKey: queryKeys.bills,
        queryFn: () => unwrap(recurringBillsService.getAll()),
    })
}

/** Debts and receivables, paid ones included unless `activeOnly`. */
export function useDebts({ activeOnly = false } = {}) {
    return useQuery({
        queryKey: queryKeys.debts,
        queryFn: () => unwrap(debtsService.getAll()),
        select: activeOnly ? debts => debts.filter(d => d.status === 'active') : undefined,
    })
}

export function useDebtPayments(debtId: string) {
    return useQuery({
        queryKey: queryKeys.debtPayments(debtId),
        queryFn: () => unwrap(debtsService.getPayments(debtId)),
    })
}

export function useWishes() {
    return useQuery({
        queryKey: queryKeys.wishes,
        queryFn: () => unwrap(wishListService.getAll()),
    })
}

export function usePurchasedWishes() {
    return useQuery({
        queryKey: queryKeys.purchasedWishes,
        queryFn: () => unwrap(wishListService.getPurchased()),
    })
}

export function usePeriodTransactions(periodId: string | null | undefined) {
    return useQuery({
        queryKey: queryKeys.transactions(periodId ?? ''),
        queryFn: () => unwrap(transactionsService.getByPeriod(periodId!)),
        enabled: !!periodId,
    })
}

/** Income/expense/savings totals per period, in one request for all the ids. */
export function usePeriodSummaries(periodIds: string[]) {
    return useQuery({
        queryKey: queryKeys.summaries(periodIds),
        queryFn: () => unwrap(transactionsService.getPeriodSummaries(periodIds)),
        enabled: periodIds.length > 0,
    })
}

export function usePeriodSummary(periodId: string | null | undefined) {
    const query = usePeriodSummaries(periodId ? [periodId] : [])
    return { ...query, data: periodId ? query.data?.[periodId] ?? null : null }
}

/** Leftover per period over the last few closed periods — what debt and wish plans pace by. */
export function useSavingsPace(): SavingsPace | null {
    const { periods } = usePeriods()
    const recent = pacePeriods(periods)
    const { data: summaries } = usePeriodSummaries(recent.map(p => p.id))
    return recent.length > 0 && summaries ? savingsPace(recent, summaries) : null
}
