import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { credentials } from './env'

/** The project the build talks to, from the same .env Vite reads. */
function projectEnv(): { url: string; anonKey: string } {
    const vars: Record<string, string> = {}
    for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
        const at = line.indexOf('=')
        if (at > 0 && !line.trimStart().startsWith('#')) vars[line.slice(0, at).trim()] = line.slice(at + 1).trim()
    }
    const url = process.env.VITE_SUPABASE_URL ?? vars.VITE_SUPABASE_URL
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? vars.VITE_SUPABASE_ANON_KEY
    if (!url || !anonKey) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing from .env')
    return { url, anonKey }
}

let client: Promise<SupabaseClient> | null = null

/**
 * The demo account's own client (same login, same row-level security as the app), for the
 * safety net only: removing what a failed test left behind. Tests act through the UI.
 */
export function demoClient(): Promise<SupabaseClient> {
    client ??= (async () => {
        const { url, anonKey } = projectEnv()
        const sb = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
        const { error } = await sb.auth.signInWithPassword(credentials)
        if (error) throw new Error(`Cleanup sign-in failed: ${error.message}`)
        return sb
    })()
    return client
}

/**
 * Deletes this run's leftover transactions: only rows whose note is exactly one of the given
 * tags, or (for a bill payment, which has the bill's name as its note) the given ids.
 * Balances follow through the database's own triggers, as with a delete in the app.
 */
export async function deleteLeftoverTransactions({ notes = [], ids = [] }: { notes?: string[]; ids?: string[] }): Promise<number> {
    const sb = await demoClient()
    let removed = 0
    if (notes.length > 0) {
        const { data, error } = await sb.from('transactions').delete().in('note', notes).select('id')
        if (error) throw new Error(`Cleanup failed: ${error.message}`)
        removed += data?.length ?? 0
    }
    if (ids.length > 0) {
        const { data, error } = await sb.from('transactions').delete().in('id', ids).select('id')
        if (error) throw new Error(`Cleanup failed: ${error.message}`)
        removed += data?.length ?? 0
    }
    return removed
}

/** The payments of a bill recorded since `since` (ISO time) at exactly `amount`: this test's own. */
export async function findBillPayments(billName: string, amount: number, since: string): Promise<string[]> {
    const sb = await demoClient()
    const { data: bills, error: billError } = await sb.from('recurring_bills').select('id').eq('name', billName)
    if (billError) throw new Error(billError.message)
    const billIds = (bills ?? []).map(b => b.id as string)
    if (billIds.length === 0) return []
    const { data, error } = await sb
        .from('transactions')
        .select('id')
        .in('recurring_bill_id', billIds)
        .eq('amount', amount)
        .gte('created_at', since)
    if (error) throw new Error(error.message)
    return (data ?? []).map(t => t.id as string)
}
