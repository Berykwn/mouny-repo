import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { ChartPie, ArrowLeftRight, CreditCard, ShoppingBag, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { AppLogo } from '@/components/app-logo'
import { payPeriodsService } from '@/services/pay-periods.service'
import type { PayPeriod } from '@/types/'

const NAV_ITEMS = [
    { to: '/', label: 'Dashboard', icon: ChartPie },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/debts', label: 'Debts', icon: CreditCard },
    { to: '/wish-list', label: 'Wishlist', icon: ShoppingBag },
]

const EXTRA_PAGES = [
    { to: '/settings', label: 'Settings' },
]

export default function AppLayout() {
    const [scrolled, setScrolled] = useState(false)
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const location = useLocation()

    useEffect(() => {
        payPeriodsService.getActive().then(({ data }) => {
            if (data) setActivePeriod(data)
        })
    }, [])

    const currentPage =
        NAV_ITEMS.find(item =>
            item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to)
        ) ?? EXTRA_PAGES.find(item => location.pathname.startsWith(item.to))

    const formatPeriodLabel = (period: PayPeriod | null) => {
        if (!period) return 'No active period'

        const start = new Date(period.start_date)
        const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        return `${startLabel} — ongoing`
    }

    return (
        <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 flex flex-col">

            <header className="bg-neutral-50 dark:bg-neutral-950 px-4 pt-6 pb-2.5">
                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-x-6">
                        <div className="flex items-center w-6 h-6 -mt-1.5">
                            <AppLogo />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[15px] font-medium leading-none tracking-tight">
                                {currentPage?.label ?? 'Mouny.'}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className={cn(
                                    "inline-block w-1 h-1 rounded-full",
                                    activePeriod ? "bg-primary" : "bg-muted-foreground"
                                )} />
                                <span className="text-xs text-muted-foreground tracking-wide">
                                    {formatPeriodLabel(activePeriod)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                                isActive
                                    ? 'text-neutral-500 dark:text-neutral-400 font-semibold'
                                    : 'text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            )}
                        >
                            <Settings className="h-[18px] w-[18px]" />
                        </NavLink>
                    </div>

                </div>
            </header>

            <main
                onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
                className="flex-1 overflow-y-auto pb-[calc(68px+env(safe-area-inset-bottom))]"
            >
                <Outlet />
            </main>

            <nav className={cn(
                'fixed bottom-0 left-0 right-0 z-40',
                'pb-[env(safe-area-inset-bottom)]',
                'flex items-center h-[68px] px-2',
                'transition-all duration-200',
                scrolled
                    ? 'bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800'
                    : 'bg-neutral-50 dark:bg-neutral-950 border-t border-transparent',
            )}>
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className="flex flex-1 flex-col items-center justify-center gap-1 h-full"
                    >
                        {({ isActive }) => (
                            <>
                                <div className="flex h-8 w-14 items-center justify-center rounded transition-colors duration-150">
                                    <Icon
                                        className={cn(
                                            'h-5 w-5 transition-colors',
                                            isActive ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-400 dark:text-neutral-600',
                                        )}
                                        strokeWidth={isActive ? 2.5 : 1.5}
                                    />
                                </div>
                                <span className={cn(
                                    'text-[10px] leading-none transition-colors',
                                    isActive
                                        ? 'text-neutral-500 dark:text-neutral-400 font-semibold'
                                        : 'text-neutral-400 dark:text-neutral-600',
                                )}>
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

        </div>
    )
}