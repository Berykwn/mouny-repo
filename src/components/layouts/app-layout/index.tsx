import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import { House, List, Wallet, Ellipsis, Plus, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { AddTransactionFlow } from '@/features/transactions/components/add-transaction-flow'
import { payPeriodsService } from '@/services/pay-periods.service'
import { toISODate, getInitials } from '@/lib/helpers'
import { emitTransactionsChanged, onPeriodsChanged } from '@/lib/transactions-bus'
import { useAuth } from '@/hooks/use-auth'
import { TopBarSlotContext } from '@/contexts/TopBarSlotContext'
import type { PayPeriod } from '@/types'
import { Sidebar } from './sidebar'
import { toast } from 'sonner'

const NAV_ITEMS = [
    { to: '/', label: 'Overview', icon: House, end: true },
    { to: '/transactions', label: 'Ledger', icon: List, end: false },
]

const NAV_ITEMS_RIGHT = [
    { to: '/accounts', label: 'Accounts', icon: Wallet, end: false },
    { to: '/menu', label: 'Menu', icon: Ellipsis, end: false },
]

const ROUTE_LABELS: Record<string, string> = {
    '/': 'Overview',
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
    const currentLabel = ROUTE_LABELS[location.pathname] ?? 'Overview'

    // Refetch whenever a period is opened or closed, so the Add button never
    // writes into a closed period or misses a newly opened one.
    useEffect(() => {
        let cancelled = false
        const load = () => payPeriodsService.getActive().then(({ data }) => {
            if (!cancelled) setActivePeriod(data)
        })
        load()
        const unsubscribe = onPeriodsChanged(load)
        return () => { cancelled = true; unsubscribe() }
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
            <Sidebar activePeriod={activePeriod} user={user} />

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
                'bg-white dark:bg-neutral-950 border-t border-line dark:border-neutral-800',
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
