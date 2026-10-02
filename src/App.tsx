import { useEffect } from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { Toaster } from './components/ui/sonner'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppRouter } from '@/routes/index'
import { OfflineBanner } from '@/components/offline-banner'
import { clearQueryCache, persistOptions, queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import { usePeriodStore } from '@/stores/period-store'

export default function App() {
    // Signing out (or in as someone else) must not show the previous user's cached data,
    // in memory or in the copy saved on the device.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
            if (event === 'SIGNED_OUT') {
                void clearQueryCache()
                usePeriodStore.getState().setSelectedPeriodId(null)
            }
        })
        return () => subscription.unsubscribe()
    }, [])

    return (
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <ThemeProvider>
                <OfflineBanner />
                <AppRouter />
                <Toaster richColors position='top-right'/>
            </ThemeProvider>
        </PersistQueryClientProvider>
    )
}
