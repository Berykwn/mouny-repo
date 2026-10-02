import { useEffect, useState } from 'react'
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

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        loading: true,
    })

    useEffect(() => {
        const apply = (s: Session | null) => {
            const session = withOfflineFallback(s)
            setState({ user: session?.user ?? null, session, loading: false })
        }

        supabase.auth.getSession().then(({ data: { session } }) => apply(session))

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') setState({ user: null, session: null, loading: false })
            else apply(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
    }

    return { ...state, signOut }
}
