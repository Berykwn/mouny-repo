import type { ReactNode } from 'react'
import { CalendarCheck, CreditCard, Tag, type LucideIcon } from 'lucide-react'
import { HeroGlow } from '@/components/hero'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'

type AuthLayoutProps = {
    children: ReactNode
}

const FEATURES: { icon: LucideIcon; tint: string; label: string; sub: string }[] = [
    { icon: CalendarCheck, tint: 'bg-brand/10 text-brand', label: 'Pay periods', sub: 'Salary to salary, not calendar months' },
    { icon: Tag, tint: 'bg-info/10 text-info', label: 'Budgets', sub: 'A limit per category, and the pace to keep it' },
    { icon: CreditCard, tint: 'bg-warning/10 text-warning', label: 'Debts & wishes', sub: 'What you owe and what you’re saving toward' },
]

/**
 * Signed-out pages in the app's own frame: on desktop a panel in the sidebar's style beside
 * the form, on mobile a plain page under the same logo row as Overview.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 flex">
            <aside className="hidden lg:flex lg:flex-col w-[400px] shrink-0 bg-surface-soft border-r border-line px-8 py-6">
                <Logo size="lg" />

                <div className="my-auto space-y-6">
                    <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Mindful money</p>
                        <p className="text-[26px] font-semibold tracking-[-0.02em] leading-[1.15] text-ink">
                            Know what’s left before you spend it.
                        </p>
                    </div>

                    <PeriodPreview />

                    <ul className="space-y-1">
                        {FEATURES.map(({ icon: Icon, tint, label, sub }) => (
                            <li key={label} className="flex items-center gap-3 py-2">
                                <span className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', tint)}>
                                    <Icon className="w-4 h-4" strokeWidth={1.9} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-[13px] font-medium text-ink">{label}</span>
                                    <span className="block text-[11.5px] text-muted-ink">{sub}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-[11px] text-subtle-ink tabular-nums">Mouny v{__APP_VERSION__}</p>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="lg:hidden px-5 pt-[22px]">
                    <Logo size="sm" />
                </header>

                <main className="flex-1 flex lg:items-center justify-center px-5 pt-10 pb-8 lg:p-8">
                    <div className="w-full max-w-sm space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}

/** The logo row of the sidebar (desktop) and the Overview header (mobile). */
function Logo({ size }: { size: 'sm' | 'lg' }) {
    return (
        <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-6 h-6 shrink-0" />
            <span className={cn('font-semibold tracking-[-0.02em] text-ink', size === 'lg' ? 'text-[20px]' : 'text-[16px]')}>
                Mouny.
            </span>
        </div>
    )
}

/** The sidebar's period card with example numbers — what the app shows once you're in. */
function PeriodPreview() {
    return (
        <div aria-hidden className="card p-4 relative overflow-hidden">
            <HeroGlow />
            <div className="relative flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[.14em] text-muted-ink">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" /> Example period
                </p>
                <p className="text-[10.5px] text-subtle-ink tabular-nums">Day 12</p>
            </div>
            <p className="relative mt-2.5 text-[11px] text-muted-ink">Left this period</p>
            <p className="relative text-[22px] font-medium tracking-[-0.02em] leading-tight tabular-nums text-ink">
                {formatCurrency(4_250_000)}
            </p>
            <div className="relative mt-2.5">
                <div className="h-1.5 rounded-full bg-line-soft overflow-hidden">
                    <div className="h-full w-[38%] rounded-full bg-brand" />
                </div>
                <p className="mt-1.5 text-[10.5px] text-subtle-ink tabular-nums">38% of income used</p>
            </div>
        </div>
    )
}

interface AuthHeadingProps {
    eyebrow: string
    title: string
    description: string
}

/** The label, title and one-line explanation that open every auth page. */
export function AuthHeading({ eyebrow, title, description }: AuthHeadingProps) {
    return (
        <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">{eyebrow}</p>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
            <p className="text-[13px] text-muted-ink leading-relaxed">{description}</p>
        </div>
    )
}

const NOTICE_TINT = {
    positive: 'bg-positive/10 text-positive',
    negative: 'bg-negative/10 text-negative',
}

interface AuthNoticeProps {
    icon: LucideIcon
    tone: keyof typeof NOTICE_TINT
    title: string
    children: ReactNode
}

/** A result that replaces the form — a sent link, an expired one — in the menu rows' tile style. */
export function AuthNotice({ icon: Icon, tone, title, children }: AuthNoticeProps) {
    return (
        <div className="card p-3.5 flex items-start gap-3">
            <span className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', NOTICE_TINT[tone])}>
                <Icon className="w-4 h-4" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-medium text-ink">{title}</p>
                <p className="text-[11.5px] text-muted-ink mt-0.5 leading-relaxed">{children}</p>
            </div>
        </div>
    )
}
