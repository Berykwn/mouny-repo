import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { PublicRoute } from './public-route'
import AppLayout from '@/components/app-layout'

// Auth
import LoginPage from '@/features/auth/login'
import ForgotPasswordPage from '@/features/auth/forgot-password'
import ResetPasswordPage from '@/features/auth/reset-password'

// Features
import DashboardPage from '@/features'
import TransactionsPage from '@/features/transactions'
import DebtsPage from '@/features/debts'
import WishListPage from '@/features/wish-list'
// import PayPeriodsPage from '@/features/pay-periods'

// Static
import NotFoundPage from '@/features/static/not-found'
import SettingsPage from '@/features/settings'

const router = createBrowserRouter([
    // Public
    {
        element: <PublicRoute />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
    },

    // Reset password — standalone, tidak butuh auth guard
    { path: '/reset-password', element: <ResetPasswordPage /> },

    // Protected + layout
    {
        element: <ProtectedRoute />,
        children: [
            {
                element: <AppLayout />,
                children: [
                    { path: '/', element: <DashboardPage /> },
                    { path: '/dashboard', element: <DashboardPage /> },
                    { path: '/transactions', element: <TransactionsPage /> },
                    { path: '/debts', element: <DebtsPage /> },
                    { path: '/wish-list', element: <WishListPage /> },
                    // { path: '/pay-periods', element: <PayPeriodsPage /> },
                    { path: '/settings',     element: <SettingsPage /> },
                ],
            },
        ],
    },

    { path: '*', element: <NotFoundPage /> },
])

export function AppRouter() {
    return <RouterProvider router={router} />
}