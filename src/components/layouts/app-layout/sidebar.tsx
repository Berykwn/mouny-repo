import { NavLink } from 'react-router-dom'
import { House, List, Wallet, CreditCard, Receipt, ShoppingBag, Tag, History, ChartLine, CalendarClock, Settings } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/helpers'
import { useMoneyGlance, type MoneyGlance } from '@/hooks/use-money-glance'
import { usePeriods } from '@/queries'
import { periodProgress, periodRange } from '@/features/periods/lib/period-progress'
import type { PayPeriod } from '@/types'

type BadgeKey = 'debts' | 'wishes' | 'bills'

interface SidebarItem {
    to: string
    label: string
    icon: typeof House
    end?: boolean
    badge?: BadgeKey
}

const GROUPS: { label: string | null; items: SidebarItem[] }[] = [
    {
        label: null,
        items: [
            { to: '/', label: 'Home', icon: House, end: true },
            { to: '/transactions', label: 'Ledger', icon: List },
            { to: '/insights', label: 'Insights', icon: ChartLine },
            { to: '/accounts', label: 'Accounts', icon: Wallet },
        ],
    },
    {
        label: 'Plan',
        items: [
            { to: '/plan', label: 'Upcoming', icon: CalendarClock },
            { to: '/bills', label: 'Bills', icon: Receipt, badge: 'bills' },
            { to: '/debts', label: 'Debts', icon: CreditCard, badge: 'debts' },
            { to: '/wish-list', label: 'Wishlist', icon: ShoppingBag, badge: 'wishes' },
        ],
    },
    {
        label: 'Settings',
        items: [
            { to: '/category', label: 'Categories', icon: Tag },
            { to: '/period-history', label: 'Periods', icon: History },
            { to: '/menu', label: 'Settings', icon: Settings },
        ],
    },
]

interface Badge {
    text: string
    /** Short reason, shown as the pill's tooltip. */
    title: string
    className: string
}

/** What needs attention on the Plan pages, as quiet pills in words. */
function badgesFrom({ debts, wishes, bills }: MoneyGlance): Partial<Record<BadgeKey, Badge>> {
    const badges: Partial<Record<BadgeKey, Badge>> = {}
    if (debts?.overdue) badges.debts = { text: String(debts.overdue), title: `${debts.overdue} overdue`, className: 'bg-negative-soft text-negative-ink' }
    else if (debts?.dueSoon) badges.debts = { text: String(debts.dueSoon), title: `${debts.dueSoon} due this week`, className: 'bg-warning-soft text-warning-ink' }
    if (bills?.overdue) badges.bills = { text: `${bills.overdue} overdue`, title: `${bills.overdue} overdue`, className: 'bg-negative-soft text-negative-ink' }
    else if (bills?.due) badges.bills = { text: `${bills.due} due`, title: `${bills.due} still to pay this period`, className: 'bg-warning-soft text-warning-ink' }
    if (wishes?.ready) badges.wishes = { text: `${wishes.ready} ready`, title: `${wishes.ready} ready to buy`, className: 'bg-brand-tint text-brand-ink' }
    return badges
}

interface SidebarProps {
    activePeriod: PayPeriod | null
    user: User | null
}

export function Sidebar({ activePeriod, user }: SidebarProps) {
    const glance = useMoneyGlance(activePeriod)
    const badges = badgesFrom(glance)
    const name = user?.user_metadata?.full_name as string | undefined

    return (
        <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 z-30 w-64 bg-surface border-r border-line px-3 pt-4 pb-3">
            <div className="flex items-center gap-2.5 px-2 pb-3">
                <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-8 h-8 shrink-0" />
                <span className="text-[18px] font-bold tracking-[-0.01em] text-ink">Mouny</span>
            </div>

            <PeriodCard period={activePeriod} />

            <nav className="mt-3 flex flex-col flex-1 overflow-y-auto -mx-1 px-1">
                {GROUPS.map((group, i) => (
                    <div key={group.label ?? i} className="flex flex-col gap-0.5">
                        {group.label && (
                            <p className="mt-4 mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-[.08em] text-subtle-ink">{group.label}</p>
                        )}
                        {group.items.map(item => (
                            <SidebarNavItem key={item.to} item={item} badge={item.badge ? badges[item.badge] : undefined} />
                        ))}
                    </div>
                ))}
            </nav>

            <NavLink
                to="/menu"
                className="mt-3 pt-3 border-t border-line flex items-center gap-2.5 px-2 rounded-[10px] hover:bg-line-soft/60 transition-colors"
            >
                <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center shrink-0 my-1">
                    <span className="text-[12px] font-semibold text-on-ink">{getInitials(user)}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink truncate">{name || 'Your account'}</p>
                    <p className="text-[12px] text-subtle-ink truncate">{user?.email ?? 'Settings'}</p>
                </div>
            </NavLink>
        </aside>
    )
}

/** The running period at a glance: its dates, the day, and how far to payday. */
function PeriodCard({ period }: { period: PayPeriod | null }) {
    const { periods } = usePeriods()

    if (!period) {
        return (
            <NavLink to="/period-history" className="mx-1 block rounded-[12px] bg-line-soft p-3 hover:bg-surface-hover transition-colors">
                <p className="text-[13.5px] font-semibold text-ink">No period yet</p>
                <p className="text-[12px] text-subtle-ink mt-0.5">Open one when your pay arrives.</p>
            </NavLink>
        )
    }

    const progress = periodProgress(period, periods)
    const days = progress.totalDays !== null
        ? `Day ${progress.day} of ${progress.totalDays}${progress.daysToPayday ? ` · payday in ${progress.daysToPayday} day${progress.daysToPayday === 1 ? '' : 's'}` : ''}`
        : `Day ${progress.day}`

    return (
        <NavLink to="/period-history" className="mx-1 block rounded-[12px] bg-line-soft p-3 hover:bg-surface-hover transition-colors">
            <p className="text-[14px] font-semibold text-ink tabular-nums">{periodRange(period.start_date, progress.endDate)}</p>
            <p className="text-[12px] text-subtle-ink tabular-nums mt-0.5">{days}</p>
            {progress.fraction !== null && (
                <div className="mt-2 h-1 rounded-full bg-line overflow-hidden">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
                </div>
            )}
        </NavLink>
    )
}

function SidebarNavItem({ item, badge }: { item: SidebarItem; badge?: Badge }) {
    const { to, label, icon: Icon, end } = item
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) => cn(
                'flex items-center gap-2.5 h-[38px] px-2.5 rounded-[10px] text-[14px] transition-colors',
                isActive ? 'bg-brand-tint text-brand-ink font-semibold' : 'text-ink/75 font-medium hover:bg-line-soft hover:text-ink'
            )}
        >
            <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
            <span className="flex-1 truncate">{label}</span>
            {badge && (
                <span title={badge.title} className={cn('h-5 px-1.5 rounded-[6px] text-[11px] font-semibold tabular-nums flex items-center', badge.className)}>
                    {badge.text}
                </span>
            )}
        </NavLink>
    )
}
