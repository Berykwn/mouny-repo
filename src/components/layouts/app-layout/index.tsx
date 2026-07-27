import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChartPie, ArrowLeftRight, CreditCard, ShoppingBag, LogOut, Menu, Tag, History, X, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { AppLogo } from '@/components/app-logo'

const NAV_ITEMS = [
    { to: '/', label: 'Dashboard', icon: ChartPie },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/debts', label: 'Debts', icon: CreditCard },
    { to: '/wish-list', label: 'Wishlist', icon: ShoppingBag },
    { to: '/accounts', label: 'Accounts', icon: Wallet },
]

const MENU_ITEMS = [
    { to: '/', label: 'Dashboard', icon: ChartPie },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/debts', label: 'Debts', icon: CreditCard },
    { to: '/wish-list', label: 'Wishlist', icon: ShoppingBag },
    { to: '/accounts', label: 'Accounts', icon: Wallet },
    { to: '/category', label: 'Categories', icon: Tag },
    { to: '/period-history', label: 'Period History', icon: History },
]

export default function AppLayout() {
    const navigate = useNavigate()
    const location = useLocation()

    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [logoutConfirm, setLogoutConfirm] = useState(false)
    const [user, setUser] = useState<{ displayName: string; email: string } | null>(null)

    async function handleLogout() {
        setLogoutConfirm(false)
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
    }

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUser({
                    displayName: data.user.user_metadata?.display_name ?? data.user.email ?? '—',
                    email: data.user.email ?? '—',
                })
            }
        })
    }, [])

    const currentPage = MENU_ITEMS.find(item =>
        item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to)
    )

    return (
        <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 flex flex-col">

            <header className="bg-neutral-50 dark:bg-neutral-950 px-4 pt-6 pb-2.5">
                <div className="flex items-center gap-x-2">
                    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="-ml-2">
                                <Menu className="w-[18px] h-[18px]" />
                            </Button>
                        </SheetTrigger>

                        <SheetContent
                            side="left"
                            className="w-full max-w-full p-0 flex flex-col bg-white dark:bg-neutral-900 border-none [&>button]:hidden"
                        >
                            <VisuallyHidden>
                                <SheetTitle>Navigation Menu</SheetTitle>
                            </VisuallyHidden>

                            <div className="flex items-center justify-between px-3 pt-6">
                                <div className="flex items-center gap-3.5">
                                    <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                                        <AppLogo />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[12px] text-neutral-400 dark:text-neutral-500 truncate leading-tight">
                                            Signed in as
                                        </span>
                                        <span className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50 truncate leading-tight">
                                            {user?.displayName ?? '—'}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <nav className="flex flex-col gap-0.5 px-3 pt-3">
                                <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest">
                                    Menu
                                </p>
                                {MENU_ITEMS.map(({ to, label, icon: Icon }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        onClick={() => setMenuOpen(false)}
                                        className={({ isActive }) => cn(
                                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150',
                                            isActive
                                                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                                                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                                        )}
                                    >
                                        <Icon className="w-[15px] h-[15px] shrink-0" strokeWidth={1.75} />
                                        {label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="px-3 pt-2">
                                <button
                                    onClick={() => {
                                        setMenuOpen(false)
                                        setLogoutConfirm(true)
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all duration-150"
                                >
                                    <LogOut className="w-[15px] h-[15px] shrink-0" strokeWidth={1.75} />
                                    Logout
                                </button>
                            </div>

                        </SheetContent>
                    </Sheet>

                    <span className="text-[15px] font-semibold">
                        {currentPage?.label ?? 'Mouny.'}
                    </span>
                </div>
            </header>

            <main
                onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
                className="flex-1 overflow-y-auto pb-[calc(68px+env(safe-area-inset-bottom))]"
            >
                <Outlet />

                <ConfirmDrawer
                    open={logoutConfirm}
                    title="Logout"
                    description="Are you sure you want to logout?"
                    confirmLabel="Logout"
                    loading={false}
                    onConfirm={handleLogout}
                    onClose={() => setLogoutConfirm(false)}
                />
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
                                            isActive
                                                ? 'text-neutral-700 dark:text-neutral-300'
                                                : 'text-neutral-400 dark:text-neutral-600',
                                        )}
                                        strokeWidth={isActive ? 2.25 : 1.5}
                                    />
                                </div>
                                <span className={cn(
                                    'text-[10px] leading-none transition-colors',
                                    isActive
                                        ? 'text-neutral-700 dark:text-neutral-300 font-semibold'
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