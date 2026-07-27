import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { PublicRoute } from './public-route'
import AppLayout from '@/components/layouts/app-layout'

// Auth
import LoginPage from '@/features/auth/login'
import ForgotPasswordPage from '@/features/auth/forgot-password'
import ResetPasswordPage from '@/features/auth/reset-password'

// Features
import DashboardPage from '@/features/dashboard'
import TransactionsPage from '@/features/transactions'
import DebtsPage from '@/features/debts'
import WishListPage from '@/features/wish-list'

// Static
import NotFoundPage from '@/features/static/not-found'
import { CategoriesPage } from '@/features/categories'
import { PeriodHistoryPage } from '@/features/periods'
import { AccountPage } from '@/features/accounts'

const router = createBrowserRouter([
    // Public
    {
        element: <PublicRoute />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
    },

    { path: '/reset-password', element: <ResetPasswordPage /> },

    {
        element: <ProtectedRoute />,
        children: [
            {
                element: <AppLayout />,
                children: [
                    { path: '/', element: <DashboardPage /> },
                    { path: '/transactions', element: <TransactionsPage /> },
                    { path: '/debts', element: <DebtsPage /> },
                    { path: '/wish-list', element: <WishListPage /> },
                    { path: '/category', element: <CategoriesPage /> },
                    { path: '/period-history', element: <PeriodHistoryPage /> },
                    { path: '/accounts', element: <AccountPage /> },
                ],
            },
        ],
    },

    { path: '*', element: <NotFoundPage /> },
])

export function AppRouter() {
    return <RouterProvider router={router} />
}