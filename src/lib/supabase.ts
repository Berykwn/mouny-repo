import { createClient, type Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/** Where supabase-js keeps the session in localStorage (its default key). */
const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

/**
 * The session saved on the device, even one whose access token has expired. Offline,
 * supabase-js can't refresh such a token and reports no session, though it keeps the
 * saved one to refresh later (it deletes it only when the server rejects it).
 */
export function storedSession(): Session | null {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY)
        const session = raw ? JSON.parse(raw) as Session : null
        return session?.user ? session : null
    } catch {
        return null
    }
}