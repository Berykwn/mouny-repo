import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { House, List, Wallet, Ellipsis, Plus, CreditCard, ShoppingBag, Tag, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { AddTransactionFlow } from '@/features/transactions/components/add-transaction-flow'
import { payPeriodsService } from '@/services/pay-periods.service'
import { toISODate } from '@/lib/helpers'
import { emitTransactionsChanged } from '@/lib/transactions-bus'
import type { PayPeriod } from '@/types'
import { toast } from 'sonner'

const NAV_ITEMS = [
    { to: '/', label: 'Today', icon: House, end: true },
    { to: '/transactions', label: 'Ledger', icon: List, end: false },
]

const NAV_ITEMS_RIGHT = [
    { to: '/accounts', label: 'Accounts', icon: Wallet, end: false },
    { to: '/menu', label: 'Menu', icon: Ellipsis, end: false },
]

// Desktop sidebar — flattens every route since there's no navigation-depth
// cost on a wide screen, unlike the 4-tab + Menu catch-all mobile uses.
const SIDEBAR_GROUPS: { label: string | null; items: typeof NAV_ITEMS }[] = [
    {
        label: null,
        items: [
            { to: '/', label: 'Today', icon: House, end: true },
            { to: '/transactions', label: 'Ledger', icon: List, end: false },
            { to: '/accounts', label: 'Accounts', icon: Wallet, end: false },
        ],
    },
    {
        label: 'Money',
        items: [
            { to: '/debts', label: 'Debts', icon: CreditCard, end: false },
            { to: '/wish-list', label: 'Wishlist', icon: ShoppingBag, end: false },
        ],
    },
    {
        label: 'Settings',
        items: [
            { to: '/category', label: 'Categories', icon: Tag, end: false },
            { to: '/period-history', label: 'Period History', icon: History, end: false },
        ],
    },
]

const TITLES: Record<string, string> = {
    '/debts': 'Debts',
    '/wish-list': 'Wishlist',
    '/accounts': 'Accounts',
    '/category': 'Categories',
    '/period-history': 'Period History',
    '/menu': 'Menu',
}

// Routes whose feature page renders its own full header (title + page-specific
// controls), so the layout's generic title bar would otherwise duplicate it.
const OWN_HEADER_ROUTES = ['/', '/transactions']

export default function AppLayout() {
    const location = useLocation()

    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)

    useEffect(() => {
        payPeriodsService.getActive().then(({ data }) => setActivePeriod(data))
    }, [])

    const handleAddClick = useCallback(() => {
        if (!activePeriod) {
            toast.error('No active pay period yet.')
            return
        }
        setAddDrawerOpen(true)
    }, [activePeriod])

    const hasOwnHeader = OWN_HEADER_ROUTES.some(path =>
        path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
    )

    const pageTitle = Object.entries(TITLES).find(([path]) =>
        path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
    )?.[1] ?? 'Mouny.'

    return (
        <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 flex flex-col">

            <aside className={cn(
                'hidden lg:flex lg:flex-col',
                'fixed inset-y-0 left-0 z-30 w-64',
                'bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800',
                'px-4 py-6',
            )}>
                <span className="text-[20px] font-semibold tracking-[-0.02em] text-[#252525] dark:text-white px-1">Mouny.</span>

                <button
                    onClick={handleAddClick}
                    className="mt-5 h-11 rounded-[12px] bg-[#6FA82B] text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#6FA82B]/90 transition-colors"
                >
                    <Plus className="w-4 h-4" strokeWidth={2} />
                    Add Transaction
                </button>

                <nav className="mt-6 flex flex-col gap-4 flex-1 overflow-y-auto">
                    {SIDEBAR_GROUPS.map((group, i) => (
                        <div key={group.label ?? i} className="space-y-0.5">
                            {group.label && (
                                <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] px-3 mb-1">
                                    {group.label}
                                </p>
                            )}
                            {group.items.map((item) => <SidebarNavItem key={item.to} {...item} />)}
                        </div>
                    ))}
                </nav>

                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
                    <SidebarNavItem to="/menu" label="Menu" icon={Ellipsis} end={false} />
                </div>
            </aside>

            {!hasOwnHeader && (
                <header className="bg-neutral-50 dark:bg-neutral-950 px-5 pt-[22px] pb-2.5 lg:hidden">
                    <span className="text-[20px] font-semibold tracking-[-0.02em] text-[#252525] dark:text-white">{pageTitle}</span>
                </header>
            )}

            <main className="flex-1 overflow-y-auto pb-[calc(76px+env(safe-area-inset-bottom))] lg:pl-64 lg:pb-0">
                <div className="lg:max-w-5xl lg:mx-auto lg:px-8 lg:py-8">
                    <Outlet />
                </div>

                {activePeriod && addDrawerOpen && (
                    <AddTransactionFlow
                        payPeriodId={activePeriod.id}
                        periodStart={activePeriod.start_date}
                        defaultDate={toISODate()}
                        onClose={() => setAddDrawerOpen(false)}
                        onSuccess={() => {
                            setAddDrawerOpen(false)
                            emitTransactionsChanged()
                        }}
                    />
                )}
            </main>

            <nav className={cn(
                'fixed bottom-0 left-0 right-0 z-40 lg:hidden',
                'pb-[env(safe-area-inset-bottom)]',
                'flex items-center h-[76px] px-1',
                'bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800',
            )}>
                {NAV_ITEMS.map((item) => <NavItem key={item.to} {...item} />)}

                <div className="w-[72px] flex justify-center shrink-0">
                    <button
                        onClick={handleAddClick}
                        className="w-[54px] h-[54px] rounded-full bg-[#6FA82B] flex items-center justify-center -mt-[40px] shadow-[0_8px_18px_-6px_rgba(111,168,43,.7)]"
                    >
                        <Plus className="w-6 h-6 text-white" strokeWidth={2} />
                    </button>
                </div>

                {NAV_ITEMS_RIGHT.map((item) => <NavItem key={item.to} {...item} />)}
            </nav>

        </div>
    )
}

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof House; end: boolean }) {
    return (
        <NavLink
            to={to}
            end={end}
            className="flex flex-1 flex-col items-center justify-center gap-[5px] h-full"
        >
            {({ isActive }) => (
                <>
                    <Icon
                        className={cn('w-5 h-5', isActive ? 'text-[#252525]' : 'text-[#b0b0aa]')}
                        strokeWidth={2}
                    />
                    <span className={cn(
                        'text-[10px] leading-none',
                        isActive ? 'font-semibold text-[#252525]' : 'text-[#9a9a94]',
                    )}>
                        {label}
                    </span>
                </>
            )}
        </NavLink>
    )
}

function SidebarNavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof House; end: boolean }) {
    return (
        <NavLink
            to={to}
            end={end}
            className="flex items-center gap-3 h-10 px-3 rounded-[10px] hover:bg-[#f4f4f2] dark:hover:bg-neutral-900 transition-colors"
        >
            {({ isActive }) => (
                <>
                    <Icon
                        className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#252525]' : 'text-[#b0b0aa]')}
                        strokeWidth={2}
                    />
                    <span className={cn(
                        'text-[13px]',
                        isActive ? 'font-semibold text-[#252525]' : 'text-[#8a8a84]',
                    )}>
                        {label}
                    </span>
                </>
            )}
        </NavLink>
    )
}
