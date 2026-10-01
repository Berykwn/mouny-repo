import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Pages share one cache: going back to a page shows what was there instantly
            // and only refetches once the data is this old.
            staleTime: 30_000,
            retry: 1,
        },
    },
})

/**
 * Money moved somewhere. A transaction touches balances, period stats, debts and wishes
 * alike, so rather than tracking which query depends on what, everything is marked
 * stale: what's on screen refetches now, the rest when it's next shown.
 */
export function invalidateAll() {
    return queryClient.invalidateQueries()
}
