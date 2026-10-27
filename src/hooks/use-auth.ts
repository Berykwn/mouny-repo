import { useSyncExternalStore } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { storedSession, supabase } from '@/lib/supabase'

interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
}

/**
 * Offline with an expired access token, supabase-js reports no session, but the user
 * hasn't signed out: stay in the app on the saved one, which refreshes once back online.
 */
function withOfflineFallback(session: Session | null): Session | null {
    if (session || navigator.onLine) return session
    return storedSession()
}

/*
 * One auth state for the whole app, seeded from the session saved on the device, so a page
 * mounting later never starts from "no user" and flashes the wrong name or initials. A
 * single listener keeps it current, including name changes (USER_UPDATED).
 */
const seed = storedSession()
let state: AuthState = { user: seed?.user ?? null, session: seed, loading: true }
const listeners = new Set<() => void>()
let started = false

function set(next: AuthState) {
    state = next
    listeners.forEach(l => l())
}

function apply(s: Session | null) {
    const session = withOfflineFallback(s)
    set({ user: session?.user ?? null, session, loading: false })
}

function start() {
    if (started) return
    started = true
    supabase.auth.getSession().then(({ data: { session } }) => apply(session))
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') set({ user: null, session: null, loading: false })
        else apply(session)
    })
}

function subscribe(listener: () => void) {
    start()
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

const getSnapshot = () => state

async function signOut() {
    await supabase.auth.signOut()
}

export function useAuth() {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot)
    return { ...snapshot, signOut }
}
