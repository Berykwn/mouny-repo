import { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { invalidateAll } from '@/lib/query-client'

export interface ServiceResult<T> {
    data: T | null
    error: string | null
}

/**
 * True when an RPC failed because the function doesn't exist yet, i.e. its migration
 * hasn't been run in the Supabase SQL editor, so the caller should use its fallback path.
 */
export function isMissingFunction(error: { code?: string } | null): boolean {
    return error?.code === 'PGRST202'
}

/**
 * What the user is told when something fails. Our own messages (`new Error(...)` in a
 * service, `raise exception` in a database function) are written for them and pass through;
 * Postgres and PostgREST errors are technical ("violates foreign key constraint ..."), so
 * they're worded from their code instead.
 */
export function handleError(error: PostgrestError | Error | unknown): string {
    const message = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : ''
    // What fetch throws when the request never reaches the server. Supabase passes it on
    // as an error object whose message is "TypeError: Failed to fetch".
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) return OFFLINE_MESSAGE

    const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code ?? '')
        : ''
    if (code) return messageForCode(code, message)
    return message || GENERIC_MESSAGE
}

function messageForCode(code: string, message: string): string {
    switch (code) {
        // `raise exception` in our own database functions.
        case 'P0001': return message || GENERIC_MESSAGE
        case '23503':
            return /^update or delete/i.test(message)
                ? IN_USE_MESSAGE
                : 'Something this refers to no longer exists. Refresh and try again.'
        case '23505': return 'That already exists.'
        case '23514':
            return /balance/i.test(message)
                ? 'Insufficient balance.'
                : 'One of the values isn’t allowed. Check the form and try again.'
        case '23502': return 'Some required details are missing.'
        case '22003': return 'That number is too large.'
        case '22P02':
        case '22007':
        case '22008': return 'Some details aren’t in the right format.'
        case '42501': return 'You don’t have permission to do that.'
        // PostgREST: the session's token is missing, invalid or expired.
        case 'PGRST301':
        case 'PGRST303': return SIGNED_OUT_MESSAGE
        // PostgREST: `.single()` found no row, e.g. it was deleted on another device.
        case 'PGRST116': return 'That item no longer exists. Refresh and try again.'
        case '57014': return 'The server took too long. Please try again.'
        default: return GENERIC_MESSAGE
    }
}

/** Supabase's API returns at most this many rows per request (its default "max rows"). */
const PAGE_SIZE = 1000

/**
 * Every row of a query, fetched a page at a time. A plain select stops silently at
 * PAGE_SIZE rows, which would make a long period or a year of history add up short.
 * The query must have a stable order (end it on a unique column) so pages don't overlap.
 */
export async function fetchAllPages<T>(
    page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
    const rows: T[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await page(from, from + PAGE_SIZE - 1)
        if (error) throw error
        rows.push(...(data ?? []))
        if (!data || data.length < PAGE_SIZE) return rows
    }
}

/**
 * The signed-in user from the locally stored session. Not `auth.getUser()`: that is a
 * round trip to the auth server on every call, and RLS checks the user on every query anyway.
 */
export async function sessionUser() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user ?? null
}

/**
 * Every method that isn't a `get…` read writes data, so once it succeeds the cached
 * queries are refreshed. Doing it here means no caller can forget to.
 * Offline, a write is refused up front: nothing queues it for later, and failing at once
 * beats a save that hangs until the request times out.
 */
export function invalidatesOnWrite<T extends object>(service: T): T {
    const methods = service as Record<string, unknown>
    for (const [name, fn] of Object.entries(methods)) {
        if (typeof fn !== 'function' || name.startsWith('get')) continue
        methods[name] = async function (this: unknown, ...args: unknown[]) {
            if (navigator.onLine === false) return { data: null, error: OFFLINE_MESSAGE }
            const result = await fn.apply(this, args)
            const failed = typeof result === 'object' && result !== null && 'error' in result && result.error
            if (!failed) void invalidateAll()
            return result
        }
    }
    return service
}

/** What a write says when the session is gone, worded for the user who'll see it. */
export const SIGNED_OUT_MESSAGE = 'You’re signed out. Please log in again.'

/** What a write says when there's no connection. */
export const OFFLINE_MESSAGE = 'You’re offline. Connect to the internet and try again.'

/** Deleting something other rows still point to, e.g. a category with transactions. */
export const IN_USE_MESSAGE = 'It’s still in use, so it can’t be deleted.'

const GENERIC_MESSAGE = 'Something went wrong. Please try again.'
