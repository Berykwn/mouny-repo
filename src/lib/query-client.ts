import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { del, get, set } from 'idb-keyval'

/** How long a copy saved on the device stays usable, e.g. to open the app offline. */
const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
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
