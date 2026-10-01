import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './components/ui/sonner'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppRouter } from '@/routes/index'
import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import { usePeriodStore } from '@/stores/period-store'

export default function App() {
    // Signing out (or in as someone else) must not show the previous user's cached data.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
            if (event === 'SIGNED_OUT') {
                queryClient.clear()
                usePeriodStore.getState().setSelectedPeriodId(null)
            }
        })
        return () => subscription.unsubscribe()
    }, [])

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AppRouter />
                <Toaster richColors position='top-right'/>
            </ThemeProvider>
        </QueryClientProvider>
    )
}
