import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute() {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground text-sm">Loading...</div>
            </div>
        )
    }

    if (!user) {
        // Remembered so signing in returns to this page rather than Home.
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
    }

    return <Outlet />
}
