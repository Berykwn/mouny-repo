import type { ComponentType } from 'react'
import { createBrowserRouter, createHashRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { PublicRoute } from './public-route'
import AppLayout from '@/components/layouts/app-layout'
import { RouteError } from '@/components/route-error'

// Auth
import LoginPage from '@/features/auth/login'
import ForgotPasswordPage from '@/features/auth/forgot-password'
import ResetPasswordPage from '@/features/auth/reset-password'

// Static
import NotFoundPage from '@/features/static/not-found'

// Feature pages load on first visit, so the first screen doesn't wait for every page
// (and the charts library) to download.
const page = (load: () => Promise<{ default: ComponentType }>): RouteObject['lazy'] =>
    () => load().then(m => ({ Component: m.default }))

const appRoutes: RouteObject[] = [
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
                    { path: '/', lazy: page(() => import('@/features/dashboard')) },
                    { path: '/transactions', lazy: page(() => import('@/features/transactions')) },
                    { path: '/debts', lazy: page(() => import('@/features/debts')) },
                    { path: '/bills', lazy: page(() => import('@/features/bills')) },
                    { path: '/wish-list', lazy: page(() => import('@/features/wish-list')) },
                    { path: '/category', lazy: page(() => import('@/features/categories').then(m => ({ default: m.CategoriesPage }))) },
                    { path: '/period-history', lazy: page(() => import('@/features/periods').then(m => ({ default: m.PeriodHistoryPage }))) },
                    { path: '/accounts', lazy: page(() => import('@/features/accounts').then(m => ({ default: m.AccountPage }))) },
                    { path: '/menu', lazy: page(() => import('@/features/menu')) },
                ],
            },
        ],
    },

    { path: '*', element: <NotFoundPage /> },
]

// Any page that throws or fails to load shows a message with a reload button.
const routes: RouteObject[] = [{ errorElement: <RouteError />, children: appRoutes }]

// GitHub Pages builds (build:gh) serve from a sub-path and can't rewrite deep links,
// so they use hash routing; every other build routes under the configured base.
const router = import.meta.env.VITE_USE_HASH_ROUTE === 'true'
    ? createHashRouter(routes)
    : createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })

export function AppRouter() {
    return <RouterProvider router={router} />
}