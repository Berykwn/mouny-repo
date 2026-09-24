import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import { House, List, Wallet, Ellipsis, Plus, CreditCard, ShoppingBag, Tag, History, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { AddTransactionFlow } from '@/features/transactions/components/add-transaction-flow'
import { payPeriodsService } from '@/services/pay-periods.service'
import { toISODate, getInitials } from '@/lib/helpers'
import { emitTransactionsChanged } from '@/lib/transactions-bus'
import { useAuth } from '@/hooks/use-auth'
import { TopBarSlotContext } from '@/contexts/TopBarSlotContext'
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

const ROUTE_LABELS: Record<string, string> = {
    '/': 'Today',
    '/transactions': 'Ledger',
    '/accounts': 'Accounts',
    '/debts': 'Debts',
    '/wish-list': 'Wishlist',
    '/category': 'Categories',
    '/period-history': 'Period History',
    '/menu': 'Menu',
}

export default function AppLayout() {
    const location = useLocation()
    const { user } = useAuth()
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [topBarSlotNode, setTopBarSlotNode] = useState<HTMLDivElement | null>(null)
    const currentLabel = ROUTE_LABELS[location.pathname] ?? 'Today'

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

    return (
        <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 flex flex-col">
            <aside className={cn(
                'hidden lg:flex lg:flex-col',
                'fixed inset-y-0 left-0 z-30 w-64',
                'bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800',
                'px-4 py-6',
            )}>
                <div className="flex items-center gap-2 px-1">
                    <img src="/favicon.svg" alt="" className="w-6 h-6 shrink-0" />
                    <span className="text-[20px] font-semibold tracking-[-0.02em] text-ink dark:text-white">Mouny.</span>
                    <span className="ml-auto px-1.5 py-0.5 rounded-md border border-line bg-surface-soft text-[10px] text-muted-ink tabular-nums">
                        v{__APP_VERSION__}
                    </span>
                </div>

                <nav className="mt-6 flex flex-col gap-4 flex-1 overflow-y-auto">
                    {SIDEBAR_GROUPS.map((group, i) => (
                        <div key={group.label ?? i} className="space-y-0.5">
                            {group.label && (
                                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-3 mb-1">
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

            <main className="flex-1 overflow-y-auto pb-[calc(76px+env(safe-area-inset-bottom))] lg:pl-64 lg:pb-0">
                <div className="lg:max-w-5xl lg:mx-auto lg:px-8 lg:py-8">
                    <div className="hidden lg:flex items-center justify-between mb-6">
                        <div className="flex items-center gap-1.5 text-[13px]">
                            <Link to="/" className="text-muted-ink hover:text-ink transition-colors">
                                Mouny
                            </Link>
                            <ChevronRight className="w-3.5 h-3.5 text-[#c4c4be]" />
                            <span className="font-medium text-ink">{currentLabel}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div ref={setTopBarSlotNode} className="contents" />
                            <button
                                onClick={handleAddClick}
                                className="h-9 px-4 rounded-[10px] bg-brand text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-brand/90 transition-colors"
                            >
                                <Plus className="w-4 h-4" strokeWidth={2} />
                                Add Transaction
                            </button>
                            <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center shrink-0">
                                <span className="text-[11.5px] font-semibold text-[#fafafa]">{getInitials(user)}</span>
                            </div>
                        </div>
                    </div>

                    <TopBarSlotContext value={topBarSlotNode}>
                        <Outlet />
                    </TopBarSlotContext>
                </div>

                {activePeriod && addDrawerOpen && (
                    <AddTransactionFlow
                        payPeriodId={activePeriod.id}
                        periodStart={activePeriod.start_date}
                        periodEnd={activePeriod.end_date ?? undefined}
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
                        className="w-[54px] h-[54px] rounded-full bg-brand flex items-center justify-center -mt-[40px] shadow-[0_8px_18px_-6px_rgba(111,168,43,.7)]"
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
                        className={cn('w-5 h-5', isActive ? 'text-brand' : 'text-[#b0b0aa]')}
                        strokeWidth={2}
                    />
                    <span className={cn(
                        'text-[10px] leading-none',
                        isActive ? 'font-semibold text-brand' : 'text-[#9a9a94]',
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
            className={({ isActive }) => cn(
                'flex items-center gap-3 h-10 px-3 rounded-[10px] transition-colors',
                isActive ? 'bg-brand/10' : 'hover:bg-surface-hover dark:hover:bg-neutral-900'
            )}
        >
            {({ isActive }) => (
                <>
                    <Icon
                        className={cn('w-4 h-4 shrink-0', isActive ? 'text-brand' : 'text-[#b0b0aa]')}
                        strokeWidth={2}
                    />
                    <span className={cn(
                        'text-[13px]',
                        isActive ? 'font-semibold text-brand' : 'text-muted-ink',
                    )}>
                        {label}
                    </span>
                </>
            )}
        </NavLink>
    )
}
