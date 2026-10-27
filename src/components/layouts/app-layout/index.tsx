import { Outlet, Link, ScrollRestoration, useLocation, useNavigate, matchPath } from 'react-router-dom'
import { House, List, ChartLine, CalendarRange, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback, useRef } from 'react'
import { AddTransactionFlow } from '@/features/transactions/components/add-transaction-flow'
import { toISODate } from '@/lib/helpers'
import { queryClient } from '@/lib/query-client'
import { accountsQuery, categoriesQuery, usePeriods } from '@/queries'
import { useAuth } from '@/hooks/use-auth'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { TopBarSlotContext } from '@/contexts/TopBarSlotContext'
import { OFFLINE_REASON } from '@/components/offline-banner'
import { CommandPalette, Kbd } from '@/components/command-palette/command-palette'
import { CHORD_TIMEOUT_MS, isTypingTarget, resolveShortcut } from '@/components/command-palette/shortcuts'
import { Sidebar } from './sidebar'
import { toast } from 'sonner'

interface NavItemDef {
    to: string
    label: string
    icon: typeof House
    end: boolean
    /** Other pages that light this tab up, e.g. Bills sits under Plan. */
    also?: string[]
}

// The four core jobs; Accounts opens from Home's balances row or Settings, and Settings from the avatar.
const NAV_ITEMS: NavItemDef[] = [
    { to: '/', label: 'Home', icon: House, end: true, also: ['/accounts', '/menu', '/category', '/period-history'] },
    { to: '/transactions', label: 'Ledger', icon: List, end: false },
]

const NAV_ITEMS_RIGHT: NavItemDef[] = [
    { to: '/insights', label: 'Insights', icon: ChartLine, end: false },
    { to: '/plan', label: 'Plan', icon: CalendarRange, end: false, also: ['/bills', '/debts', '/wish-list'] },
]

const ROUTE_LABELS: Record<string, string> = {
    '/': 'Home',
    '/transactions': 'Ledger',
    '/insights': 'Insights',
    '/plan': 'Plan',
    '/bills': 'Bills',
    '/accounts': 'Accounts',
    '/debts': 'Debts',
    '/wish-list': 'Wishlist',
    '/category': 'Categories',
    '/period-history': 'Periods',
    '/menu': 'Settings',
}

/** The palette and single-key shortcuts are a desktop thing; phones have no keyboard to spare. */
const DESKTOP = '(min-width: 1024px)'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function AppLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user } = useAuth()
    const online = useOnlineStatus()
    // From the shared cache, which refreshes when a period is opened or closed, so the
    // Add button never writes into a closed period or misses a newly opened one.
    const { activePeriod } = usePeriods()
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [paletteOpen, setPaletteOpen] = useState(false)
    const [topBarSlotNode, setTopBarSlotNode] = useState<HTMLDivElement | null>(null)
    const currentLabel = ROUTE_LABELS[location.pathname] ?? 'Home'

    // What the add-transaction and other forms need, fetched up front so they open filled in.
    useEffect(() => {
        void queryClient.prefetchQuery(accountsQuery)
        void queryClient.prefetchQuery(categoriesQuery)
    }, [])

    const handleAddClick = useCallback(() => {
        // The last data stays on screen offline, but a new entry would only fail to save.
        if (!online) {
            toast(OFFLINE_REASON)
            return
        }
        if (!activePeriod) {
            toast.error('No active pay period yet.')
            return
        }
        setAddDrawerOpen(true)
    }, [activePeriod, online])

    const openPalette = useCallback(() => setPaletteOpen(true), [])

    useShortcuts({
        palette: () => setPaletteOpen(open => !open),
        newTransaction: handleAddClick,
        goLedger: () => navigate('/transactions'),
        goInsights: () => navigate('/insights'),
    }, paletteOpen)

    return (
        <div className="min-h-[100dvh] bg-surface flex flex-col">
            <Sidebar activePeriod={activePeriod} user={user} />

            {/* The window scrolls (not main), so the desktop top bar can stick; each page opens at its top. */}
            <ScrollRestoration />
            <main className="flex-1 pb-[calc(76px+env(safe-area-inset-bottom))] lg:pl-64 lg:pb-0">
                {/* Desktop top bar: the page's name, its own controls (portalled in), search and the one primary action */}
                <div className="hidden lg:flex sticky top-0 z-30 h-16 items-center gap-3 px-8 border-b border-line bg-surface/95 backdrop-blur">
                    <h1 className="mr-auto text-[22px] font-semibold tracking-[-0.01em] text-ink truncate">{currentLabel}</h1>
                    <div ref={setTopBarSlotNode} className="contents" />
                    <button
                        type="button"
                        onClick={openPalette}
                        aria-label="Search and commands"
                        aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
                        className="h-9 pl-3 pr-1.5 rounded-[10px] bg-line-soft text-[13px] text-subtle-ink hover:text-muted-ink transition-colors flex items-center gap-2"
                    >
                        <Search aria-hidden="true" className="w-4 h-4" />
                        Search
                        <Kbd>{IS_MAC ? '⌘K' : 'Ctrl K'}</Kbd>
                    </button>
                    <button
                        onClick={handleAddClick}
                        title={online ? undefined : OFFLINE_REASON}
                        className={cn(
                            'h-9 px-4 rounded-[10px] bg-action text-on-action text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-action/90 transition-colors',
                            !online && 'opacity-50',
                        )}
                    >
                        <Plus className="w-4 h-4" strokeWidth={2} />
                        Add transaction
                    </button>
                </div>

                <div className="lg:max-w-5xl lg:mx-auto lg:px-8 lg:py-8">
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
                        onSuccess={() => setAddDrawerOpen(false)}
                    />
                )}
            </main>

            <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNewTransaction={handleAddClick} />

            {/* A 76px row of tabs; the home-indicator inset is added below it, not taken out of it. */}
            <nav className={cn(
                'fixed bottom-0 left-0 right-0 z-40 lg:hidden',
                'h-[calc(76px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]',
                'bg-surface border-t border-line',
            )}>
                <div className="flex items-center h-[76px] px-1">
                    {NAV_ITEMS.map((item) => <NavItem key={item.to} {...item} />)}

                    <div className="w-[72px] flex justify-center shrink-0">
                        <button
                            onClick={handleAddClick}
                            aria-label={online ? 'Add transaction' : `Add transaction. ${OFFLINE_REASON}`}
                            className={cn(
                                'w-[54px] h-[54px] rounded-full bg-action flex items-center justify-center -mt-[40px] shadow-[0_8px_18px_-8px_rgba(0,0,0,.45)] transition-opacity',
                                !online && 'opacity-50',
                            )}
                        >
                            <Plus aria-hidden="true" className="w-6 h-6 text-on-action" strokeWidth={2} />
                        </button>
                    </div>

                    {NAV_ITEMS_RIGHT.map((item) => <NavItem key={item.to} {...item} />)}
                </div>
            </nav>

        </div>
    )
}

interface ShortcutHandlers {
    palette: () => void
    newTransaction: () => void
    goLedger: () => void
    goInsights: () => void
}

/**
 * ⌘K / Ctrl+K from any page; N, /, and G then L or I when not typing. Nothing fires while a
 * drawer or dialog is open (other than ⌘K closing the palette itself), so a shortcut never
 * stacks a second form on top of the first.
 */
function useShortcuts(handlers: ShortcutHandlers, paletteOpen: boolean) {
    const handlersRef = useRef(handlers)
    useEffect(() => { handlersRef.current = handlers })

    useEffect(() => {
        let pendingG = false
        let timer: ReturnType<typeof setTimeout> | undefined
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.repeat || !window.matchMedia(DESKTOP).matches) return
            const modalOpen = !!document.querySelector('[aria-modal="true"], [role="dialog"][data-state="open"]')
            const result = resolveShortcut(event, isTypingTarget(event.target), pendingG)
            pendingG = result.pendingG
            clearTimeout(timer)
            if (pendingG) timer = setTimeout(() => { pendingG = false }, CHORD_TIMEOUT_MS)
            if (!result.action) return
            if (modalOpen && !(result.action === 'palette' && paletteOpen)) return
            event.preventDefault()
            const h = handlersRef.current
            if (result.action === 'palette') h.palette()
            else if (result.action === 'new-transaction') h.newTransaction()
            else if (result.action === 'go-ledger') h.goLedger()
            else h.goInsights()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            clearTimeout(timer)
        }
    }, [paletteOpen])
}

function NavItem({ to, label, icon: Icon, end, also }: NavItemDef) {
    const { pathname } = useLocation()
    const own = !!matchPath({ path: to, end }, pathname)
    const alsoActive = !!also?.some(p => matchPath({ path: p, end: false }, pathname))
    const isActive = own || alsoActive
    // A Link, not a NavLink: a NavLink only marks itself current on its own path, and a
    // screen reader should hear the tab that's lit up for a page under it (Bills under Plan) too.
    return (
        <Link
            to={to}
            aria-current={own ? 'page' : alsoActive ? 'true' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-[5px] h-full"
        >
            <Icon
                aria-hidden="true"
                className={cn('w-5 h-5', isActive ? 'text-brand' : 'text-faint-ink')}
                strokeWidth={2}
            />
            <span className={cn(
                'text-[10px] leading-none',
                isActive ? 'font-semibold text-brand' : 'text-subtle-ink',
            )}>
                {label}
            </span>
        </Link>
    )
}
