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

export function handleError(error: PostgrestError | Error | unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error !== null && 'message' in error) {
        return (error as PostgrestError).message
    }
    return 'Something went wrong. Please try again.'
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
 */
export function invalidatesOnWrite<T extends object>(service: T): T {
    const methods = service as Record<string, unknown>
    for (const [name, fn] of Object.entries(methods)) {
        if (typeof fn !== 'function' || name.startsWith('get')) continue
        methods[name] = async function (this: unknown, ...args: unknown[]) {
            const result = await fn.apply(this, args)
            const failed = typeof result === 'object' && result !== null && 'error' in result && result.error
            if (!failed) void invalidateAll()
            return result
        }
    }
    return service
}
