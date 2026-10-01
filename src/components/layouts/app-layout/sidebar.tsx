import { NavLink } from 'react-router-dom'
import { House, List, Wallet, CreditCard, ShoppingBag, Tag, History, ChevronRight } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import { formatCurrency, getDaysBetween, getInitials } from '@/lib/helpers'
import { HeroGlow } from '@/components/hero'
import { useMoneyGlance, type MoneyGlance } from '@/hooks/use-money-glance'
import type { PeriodSummary } from '@/lib/period-summary'
import type { PayPeriod } from '@/types'

type Tint = 'brand' | 'info' | 'warning' | 'violet'
type BadgeKey = 'debts' | 'wishes'

interface SidebarItem {
    to: string
    label: string
    icon: typeof House
    end?: boolean
    tint: Tint
    badge?: BadgeKey
}

// Same tinted tiles as the mobile Menu, so a route looks the same on both.
const TINT: Record<Tint, string> = {
    brand: 'bg-brand/10 text-brand',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
    violet: 'bg-[#8b5cf6]/10 text-[#7c3aed]',
}

const GROUPS: { label: string | null; items: SidebarItem[] }[] = [
    {
        label: null,
        items: [
            { to: '/', label: 'Overview', icon: House, end: true, tint: 'brand' },
            { to: '/transactions', label: 'Ledger', icon: List, tint: 'info' },
            { to: '/accounts', label: 'Accounts', icon: Wallet, tint: 'violet' },
        ],
    },
    {
        label: 'Money',
        items: [
            { to: '/debts', label: 'Debts', icon: CreditCard, tint: 'warning', badge: 'debts' },
            { to: '/wish-list', label: 'Wishlist', icon: ShoppingBag, tint: 'brand', badge: 'wishes' },
        ],
    },
    {
        label: 'Settings',
        items: [
            { to: '/category', label: 'Categories', icon: Tag, tint: 'info' },
            { to: '/period-history', label: 'Period History', icon: History, tint: 'info' },
        ],
    },
]

interface Badge {
    count: number
    /** Short reason, shown as the pill's tooltip. */
    title: string
    className: string
}

/** What needs attention on the Debts and Wishlist pages, as nav badges. */
function badgesFrom({ debts, wishes }: MoneyGlance): Partial<Record<BadgeKey, Badge>> {
    const badges: Partial<Record<BadgeKey, Badge>> = {}
    if (debts?.overdue) badges.debts = { count: debts.overdue, title: `${debts.overdue} overdue`, className: 'bg-negative text-white' }
    else if (debts?.dueSoon) badges.debts = { count: debts.dueSoon, title: `${debts.dueSoon} due this week`, className: 'bg-warning/15 text-warning' }
    if (wishes?.ready) badges.wishes = { count: wishes.ready, title: `${wishes.ready} ready to buy`, className: 'bg-positive/10 text-positive' }
    return badges
}

interface SidebarProps {
    activePeriod: PayPeriod | null
    user: User | null
}

export function Sidebar({ activePeriod, user }: SidebarProps) {
    const glance = useMoneyGlance(activePeriod)
    const { summary } = glance
    const badges = badgesFrom(glance)
    const name = user?.user_metadata?.full_name as string | undefined

    return (
        <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 z-30 w-64 bg-surface-soft border-r border-line px-3 py-5">
            <div className="flex items-center gap-2 px-2">
                <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-6 h-6 shrink-0" />
                <span className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Mouny.</span>
                <span className="ml-auto px-1.5 py-0.5 rounded-md border border-line bg-white text-[10px] text-muted-ink tabular-nums">
                    v{__APP_VERSION__}
                </span>
            </div>

            <PeriodCard period={activePeriod} summary={summary} />

            <nav className="mt-5 flex flex-col gap-4 flex-1 overflow-y-auto -mx-1 px-1">
                {GROUPS.map((group, i) => (
                    <div key={group.label ?? i} className="space-y-0.5">
                        {group.label && (
                            <p className="text-[10.5px] uppercase tracking-[.14em] text-subtle-ink px-2.5 mb-1.5">{group.label}</p>
                        )}
                        {group.items.map(item => (
                            <SidebarNavItem key={item.to} item={item} badge={item.badge ? badges[item.badge] : undefined} />
                        ))}
                    </div>
                ))}
            </nav>

            <NavLink
                to="/menu"
                className={({ isActive }) => cn(
                    'mt-3 flex items-center gap-2.5 rounded-[14px] border p-2.5 transition-colors',
                    isActive ? 'bg-white border-line shadow-[0_1px_2px_rgba(0,0,0,.05)]' : 'border-transparent hover:bg-white hover:border-line'
                )}
            >
                <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center shrink-0">
                    <span className="text-[11.5px] font-semibold text-[#fafafa]">{getInitials(user)}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-ink truncate">{name || 'Your account'}</p>
                    <p className="text-[10.5px] text-muted-ink truncate">{user?.email ?? 'Menu & settings'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-subtle-ink shrink-0" />
            </NavLink>
        </aside>
    )
}

function PeriodCard({ period, summary }: { period: PayPeriod | null; summary: PeriodSummary | null }) {
    if (!period) {
        return (
            <NavLink to="/period-history" className="mt-5 block rounded-[16px] border border-dashed border-line bg-white p-3.5 hover:border-ink/20 transition-colors">
                <p className="text-[12.5px] font-medium text-ink">No active period</p>
                <p className="text-[11px] text-muted-ink mt-0.5">Start one when your salary comes in.</p>
            </NavLink>
        )
    }

    const month = new Date(period.start_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })
    const day = Math.max(1, getDaysBetween(period.start_date) + 1)
    const left = summary ? summary.net : null
    const usedPct = summary && summary.income > 0 ? Math.min(100, Math.round((summary.expense / summary.income) * 100)) : null

    return (
        <NavLink
            to="/transactions"
            className="mt-5 block card p-3.5 relative overflow-hidden hover:border-ink/15 transition-colors"
        >
            <HeroGlow />
            <div className="relative flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[.14em] text-muted-ink">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" /> {month} period
                </p>
                <p className="text-[10.5px] text-subtle-ink tabular-nums">Day {day}</p>
            </div>
            <p className="relative mt-2.5 text-[11px] text-muted-ink">Left this period</p>
            <p className={cn(
                'relative text-[19px] font-medium tracking-[-0.02em] leading-tight tabular-nums truncate',
                left !== null && left < 0 ? 'text-negative' : 'text-ink'
            )}>
                {left === null ? '—' : formatCurrency(left)}
            </p>
            {usedPct !== null && (
                <div className="relative mt-2.5">
                    <div className="h-1 rounded-full bg-line-soft overflow-hidden">
                        <div
                            className={cn('h-full rounded-full', usedPct >= 90 ? 'bg-negative' : usedPct >= 75 ? 'bg-warning' : 'bg-brand')}
                            style={{ width: `${usedPct}%` }}
                        />
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-subtle-ink tabular-nums">{usedPct}% of income used</p>
                </div>
            )}
        </NavLink>
    )
}

function SidebarNavItem({ item, badge }: { item: SidebarItem; badge?: Badge }) {
    const { to, label, icon: Icon, end, tint } = item
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) => cn(
                'flex items-center gap-2.5 h-10 px-2 rounded-[12px] border transition-colors',
                isActive
                    ? 'bg-white border-line shadow-[0_1px_2px_rgba(0,0,0,.05)]'
                    : 'border-transparent hover:bg-white/70'
            )}
        >
            {({ isActive }) => (
                <>
                    <span className={cn(
                        'w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 transition-colors',
                        isActive ? TINT[tint] : 'bg-line-soft text-muted-ink'
                    )}>
                        <Icon className="w-[15px] h-[15px]" strokeWidth={1.9} />
                    </span>
                    <span className={cn('flex-1 text-[13px] truncate', isActive ? 'font-semibold text-ink' : 'text-muted-ink')}>
                        {label}
                    </span>
                    {badge && (
                        <span title={badge.title} className={cn('min-w-5 h-5 px-1.5 rounded-full text-[10.5px] font-semibold tabular-nums flex items-center justify-center', badge.className)}>
                            {badge.count}
                        </span>
                    )}
                </>
            )}
        </NavLink>
    )
}
