import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { CreditCard, Receipt, ShoppingBag, Tag, History, LogOut, ChevronRight, CalendarCheck, CalendarPlus, Monitor, Sun, Moon, Palette } from 'lucide-react'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { BottomDrawer } from '@/components/bottom-drawer'
import { HeroGlow } from '@/components/hero'
import { ClosePeriodForm } from '@/features/periods/components/close-period-form'
import { OpenPeriodForm } from '@/features/periods/components/open-period-form'
import { useBudgets, useCategories, usePeriods } from '@/queries'
import { useAuth } from '@/hooks/use-auth'
import { useMoneyGlance } from '@/hooks/use-money-glance'
import { formatCurrency, formatShortCurrency, getDaysBetween, getInitials } from '@/lib/helpers'
import type { PayPeriod } from '@/types'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'

const TINT = {
    brand: 'bg-brand/10 text-brand',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
}

interface Counts {
    categories: number
    budgets: number
    closedPeriods: number
}

export default function MenuPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [logoutConfirm, setLogoutConfirm] = useState(false)
    const [periodDrawer, setPeriodDrawer] = useState<'open' | 'close' | null>(null)
    const { periods, activePeriod, isSuccess: periodsLoaded } = usePeriods()
    const { data: categories } = useCategories()
    const { data: budgets } = useBudgets()
    const counts: Counts | null = periodsLoaded && categories && budgets ? {
        categories: categories.length,
        budgets: budgets.length,
        closedPeriods: periods.filter(p => p.status === 'closed').length,
    } : null
    const { summary, left, bills, debts, wishes } = useMoneyGlance(activePeriod)

    async function handleLogout() {
        setLogoutConfirm(false)
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
    }

    const name = user?.user_metadata?.full_name as string | undefined
    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : null

    const debtSub = !debts
        ? 'Who you owe and who owes you'
        : debts.open === 0
            ? 'Nothing open'
            : [debts.owed > 0 && `You owe ${formatShortCurrency(debts.owed)}`, debts.receivable > 0 && `owed ${formatShortCurrency(debts.receivable)}`]
                .filter(Boolean).join(' · ')
    const debtFlag = debts?.overdue
        ? { text: `${debts.overdue} overdue`, className: 'bg-negative/10 text-negative' }
        : debts?.dueSoon
            ? { text: `${debts.dueSoon} due soon`, className: 'bg-warning/10 text-warning' }
            : null

    const billSub = !bills
        ? 'Rent, utilities and subscriptions'
        : bills.due === 0
            ? 'Nothing due this period'
            : `${bills.due} due · ${formatShortCurrency(bills.reserved)} set aside`
    const billFlag = bills?.overdue ? { text: `${bills.overdue} overdue`, className: 'bg-negative/10 text-negative' } : null

    const wishSub = !wishes
        ? 'Things you’re saving toward'
        : wishes.count === 0
            ? 'Nothing on the list yet'
            : `${wishes.count} wish${wishes.count === 1 ? '' : 'es'} in progress`
    const wishFlag = wishes?.ready ? { text: `${wishes.ready} ready`, className: 'bg-positive/10 text-positive' } : null

    return (
        <>
            <PageHeader title="Menu" />
            <section className="px-4 pb-4 lg:px-0 space-y-4">
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start">
                    {/* Who and when — the hero, on the right on desktop like every other page */}
                    <div className="space-y-4 lg:order-2">
                        <header className="card p-5 relative overflow-hidden">
                            <HeroGlow />
                            <div className="relative flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center shrink-0">
                                    <span className="text-[15px] font-semibold text-on-ink">{getInitials(user)}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[16px] font-medium tracking-[-0.01em] text-ink truncate">{name || 'Your account'}</p>
                                    <p className="text-[12px] text-muted-ink truncate">{user?.email}</p>
                                </div>
                            </div>
                            {memberSince && (
                                <p className="relative mt-4 pt-3 border-t border-line-soft text-[11.5px] text-muted-ink">
                                    Tracking with Mouny since {memberSince}
                                </p>
                            )}
                        </header>

                        <PeriodCard
                            period={activePeriod}
                            left={left}
                            usedPct={summary && summary.income > 0 ? Math.min(100, Math.round((summary.expense / summary.income) * 100)) : null}
                            onOpen={() => setPeriodDrawer('open')}
                            onClose={() => setPeriodDrawer('close')}
                        />
                    </div>

                    <div className="space-y-4 lg:order-1">
                        <Group label="Money">
                            <Row to="/debts" icon={CreditCard} tint="warning" label="Debts" sub={debtSub} flag={debtFlag} />
                            <Row to="/bills" icon={Receipt} tint="info" label="Bills" sub={billSub} flag={billFlag} />
                            <Row to="/wish-list" icon={ShoppingBag} tint="brand" label="Wishlist" sub={wishSub} flag={wishFlag} />
                        </Group>

                        <Group label="Settings">
                            <Row
                                to="/category" icon={Tag} tint="info" label="Categories"
                                sub={counts ? `${counts.categories} categories · ${counts.budgets} with a budget` : 'Icons, colors and budgets'}
                            />
                            <Row
                                to="/period-history" icon={History} tint="info" label="Period History"
                                sub={counts ? `${counts.closedPeriods} closed period${counts.closedPeriods === 1 ? '' : 's'}` : 'Past pay periods'}
                            />
                            <AppearanceRow />
                        </Group>

                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => setLogoutConfirm(true)}
                                className="card w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-soft transition-colors"
                            >
                                <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 bg-negative/10 text-negative">
                                    <LogOut className="w-4 h-4" strokeWidth={1.9} />
                                </span>
                                <span className="flex-1 text-[13px] font-medium text-negative">Log out</span>
                            </button>
                            <p className="text-center text-[11px] text-subtle-ink tabular-nums">Mouny v{__APP_VERSION__}</p>
                        </div>
                    </div>
                </div>

                <BottomDrawer
                    open={periodDrawer === 'close'}
                    onClose={() => setPeriodDrawer(null)}
                    title="Close Period"
                >
                    {activePeriod && periodDrawer === 'close' && (
                        <ClosePeriodForm period={activePeriod} onSuccess={() => setPeriodDrawer(null)} />
                    )}
                </BottomDrawer>

                <BottomDrawer
                    open={periodDrawer === 'open'}
                    onClose={() => setPeriodDrawer(null)}
                    title="Open New Period"
                >
                    {periodDrawer === 'open' && <OpenPeriodForm onSuccess={() => setPeriodDrawer(null)} />}
                </BottomDrawer>

                <ConfirmDrawer
                    open={logoutConfirm}
                    title="Log out"
                    description="You’ll need to sign in again to see your money."
                    confirmLabel="Log out"
                    loading={false}
                    onConfirm={handleLogout}
                    onClose={() => setLogoutConfirm(false)}
                />
            </section>
        </>
    )
}

interface PeriodCardProps {
    period: PayPeriod | null
    left: number | null
    usedPct: number | null
    onOpen: () => void
    onClose: () => void
}

function PeriodCard({ period, left, usedPct, onOpen, onClose }: PeriodCardProps) {
    if (!period) {
        return (
            <div className="card p-5">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Pay period</p>
                <p className="mt-2 text-[14px] font-medium text-ink">No period running</p>
                <p className="mt-0.5 text-[12px] text-muted-ink leading-relaxed">Open one when your salary comes in — every transaction lands in it.</p>
                <button
                    type="button"
                    onClick={onOpen}
                    className="mt-4 w-full h-11 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors flex items-center justify-center gap-2"
                >
                    <CalendarPlus className="w-4 h-4" /> Open new period
                </button>
            </div>
        )
    }

    const month = new Date(period.start_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long' })
    const day = Math.max(1, getDaysBetween(period.start_date) + 1)

    return (
        <div className="card p-5">
            <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[.14em] text-muted-ink">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" /> {month} period
                </p>
                <p className="text-[11px] text-subtle-ink tabular-nums">Day {day}</p>
            </div>
            <p className="mt-3 text-[11px] text-muted-ink">Left this period</p>
            <p className={cn(
                'text-[22px] font-medium tracking-[-0.02em] leading-tight tabular-nums',
                left !== null && left < 0 ? 'text-negative' : 'text-ink'
            )}>
                {left === null ? '—' : formatCurrency(left)}
            </p>
            {usedPct !== null && (
                <>
                    <div className="mt-3 h-1.5 rounded-full bg-line-soft overflow-hidden">
                        <div
                            className={cn('h-full rounded-full', usedPct >= 90 ? 'bg-negative' : usedPct >= 75 ? 'bg-warning' : 'bg-brand')}
                            style={{ width: `${usedPct}%` }}
                        />
                    </div>
                    <p className="mt-1.5 text-[11px] text-subtle-ink tabular-nums">{usedPct}% of income used</p>
                </>
            )}
            {/* Closing is deliberate and rare: a quiet outline button, never the green primary */}
            <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full h-11 rounded-[14px] text-[13px] font-semibold border border-line text-ink hover:bg-surface-hover transition-colors flex items-center justify-center gap-2"
            >
                <CalendarCheck className="w-4 h-4" /> Close period
            </button>
        </div>
    )
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Tag }[] = [
    { value: 'system', label: 'Auto', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
]

function AppearanceRow() {
    const { theme, setTheme } = useTheme()

    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <span className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', TINT.info)}>
                <Palette className="w-4 h-4" strokeWidth={1.9} />
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-ink">Appearance</span>
                <span className="block text-[11.5px] text-muted-ink truncate">
                    {theme === 'system' ? 'Follows your device' : `Always ${theme}`}
                </span>
            </span>
            <div role="radiogroup" aria-label="Theme" className="flex shrink-0 rounded-[10px] bg-line-soft p-0.5">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={theme === value}
                        aria-label={label}
                        title={label}
                        onClick={() => setTheme(value)}
                        className={cn(
                            'w-8 h-7 rounded-[8px] flex items-center justify-center transition-colors',
                            theme === value
                                ? 'bg-raised text-ink shadow-sm'
                                : 'text-muted-ink hover:text-ink'
                        )}
                    >
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.9} />
                    </button>
                ))}
            </div>
        </div>
    )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-1 mb-1.5">{label}</p>
            <nav className="card overflow-hidden divide-y divide-line-soft">{children}</nav>
        </div>
    )
}

interface RowProps {
    to: string
    icon: typeof Tag
    tint: keyof typeof TINT
    label: string
    sub: string
    flag?: { text: string; className: string } | null
}

function Row({ to, icon: Icon, tint, label, sub, flag }: RowProps) {
    return (
        <NavLink to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-soft transition-colors">
            <span className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', TINT[tint])}>
                <Icon className="w-4 h-4" strokeWidth={1.9} />
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-ink">{label}</span>
                <span className="block text-[11.5px] text-muted-ink truncate">{sub}</span>
            </span>
            {flag && (
                <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0', flag.className)}>{flag.text}</span>
            )}
            <ChevronRight className="w-4 h-4 text-faint-ink shrink-0" />
        </NavLink>
    )
}
