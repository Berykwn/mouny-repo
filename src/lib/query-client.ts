import { QueryCache, QueryClient, type Query } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { del, get, set } from 'idb-keyval'
import { toast } from 'sonner'
import { OFFLINE_MESSAGE } from '@/services/_base'

/** How long a copy saved on the device stays usable, e.g. to open the app offline. */
const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000

/** One toast for every failed load, so a page with several queries doesn't stack them. */
const LOAD_ERROR_TOAST = 'load-error'
/** The queries whose last load failed; the toast goes once they've all loaded again. */
const failedQueries = new Set<string>()

/**
 * Says a load failed, from one place rather than each page. Offline the banner already
 * says so; with data from before still on screen the user only needs to know it's not fresh.
 */
function reportLoadError(error: Error, query: Query<unknown, unknown, unknown>) {
    failedQueries.add(query.queryHash)
    if (navigator.onLine === false) return
    const unreachable = error.message === OFFLINE_MESSAGE
    const message = query.state.data !== undefined
        ? 'Couldn’t refresh. Showing your last saved data.'
        : unreachable
            ? 'Couldn’t reach the server. Check your connection and try again.'
            : error.message
    toast.error(message, { id: LOAD_ERROR_TOAST })
}

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: reportLoadError,
        // Back online, or the next refetch worked: the warning no longer applies.
        onSuccess: (_data, query) => {
            if (!failedQueries.delete(query.queryHash) || failedQueries.size > 0) return
            toast.dismiss(LOAD_ERROR_TOAST)
        },
    }),
    defaultOptions: {
        queries: {
            // Pages share one cache: going back to a page shows what was there instantly
            // and only refetches once the data is this old.
            staleTime: 30_000,
            // Kept as long as the saved copy, or it would be dropped before it's saved.
            gcTime: PERSIST_MAX_AGE,
            retry: 1,
        },
    },
})

/**
 * The cache is also saved in IndexedDB, so a reopened app shows the last balances and
 * transactions straight away, offline too, and refreshes them once it's online.
 */
const persister = createAsyncStoragePersister({
    storage: { getItem: get, setItem: set, removeItem: del },
    key: 'mouny-query-cache',
})

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
    persister,
    maxAge: PERSIST_MAX_AGE,
    // A new release may change what the queries return, so it starts from a fresh cache.
    buster: __APP_VERSION__,
}

/** Forgets the cache, in memory and on the device, e.g. when the user signs out. */
export function clearQueryCache() {
    queryClient.clear()
    failedQueries.clear()
    return persister.removeClient()
}

/**
 * Money moved somewhere. A transaction touches balances, period stats, debts and wishes
 * alike, so rather than tracking which query depends on what, everything is marked
 * stale: what's on screen refetches now, the rest when it's next shown.
 */
export function invalidateAll() {
    return queryClient.invalidateQueries()
}
