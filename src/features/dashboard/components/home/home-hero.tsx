import { Link } from 'react-router-dom'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { PeriodStats } from '@/hooks/use-period-stats'
import { HERO_STATUS_LABEL, heroNumbers, type HeroStatus } from '../../lib/home'

const STATUS_DOT: Record<HeroStatus, string> = {
    'on-track': 'bg-brand',
    tight: 'bg-warning',
    over: 'bg-negative',
    closed: 'bg-subtle-ink',
}

/**
 * "What can I spend today?" in one number, with a word for how it's going and one thin bar:
 * how much of the income is used, and a tick where today sits in the period.
 */
export function HomeHero({ stats }: { stats: PeriodStats }) {
    const hero = heroNumbers(stats)
    const closed = hero.status === 'closed'
    const negative = hero.today < 0
    const usedPct = Math.round(hero.used * 100)
    const elapsedPct = hero.elapsed !== null ? Math.round(hero.elapsed * 100) : null

    const legend = [
        { label: 'Spent', amount: stats.totalSpending },
        { label: 'Saved', amount: stats.totalSavings },
        { label: 'Bills held', amount: stats.reservedBills },
    ].filter(l => l.amount > 0 || l.label === 'Spent')

    return (
        <section aria-label="Safe to spend" className="pt-1">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-muted-ink">
                    {closed ? 'Left at the end of the period'
                        : hero.pastPayday ? 'Past your usual payday'
                            : hero.daysLeft !== null ? 'Safe to spend today' : 'Safe to spend'}
                </p>
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                    <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', STATUS_DOT[hero.status])} />
                    {HERO_STATUS_LABEL[hero.status]}
                </p>
            </div>

            {hero.pastPayday ? (
                // The end was only a guess from the last period's length; a daily number now
                // would be one too. What's left, and the way to start the next period.
                <>
                    <p className={cn(
                        'mt-1.5 text-[44px] lg:text-[56px] font-semibold leading-none tracking-[-.035em] tabular-nums',
                        stats.remaining < 0 ? 'text-negative' : 'text-ink'
                    )}>
                        {formatCurrency(stats.remaining)}
                    </p>
                    <p className="mt-2 text-[13.5px] text-muted-ink">
                        left this period.{' '}
                        <Link to="/period-history" state={{ close: true }} className="font-semibold text-brand-ink hover:underline underline-offset-2">
                            Close the period
                        </Link>
                    </p>
                </>
            ) : (
                <p className={cn(
                    'mt-1.5 text-[44px] lg:text-[56px] font-semibold leading-none tracking-[-.035em] tabular-nums',
                    negative ? 'text-negative' : 'text-ink'
                )}>
                    {formatCurrency(hero.today)}
                </p>
            )}
            {!closed && !hero.pastPayday && hero.daysLeft !== null && hero.daysLeft > 1 && (
                <p className="mt-2 text-[13.5px] text-muted-ink">
                    <span className={cn('font-semibold', stats.remaining < 0 ? 'text-negative' : 'text-ink')}>{formatCurrency(stats.remaining)}</span>
                    {' '}for the next {hero.daysLeft} days
                </p>
            )}

            {/* The legend reads out the amounts; the bar is for the eye. */}
            <div
                className="relative mt-4 h-1.5 rounded-full bg-line-soft"
                title={`${usedPct}% of this period's income used${elapsedPct !== null ? ` · ${elapsedPct}% of the period gone` : ''}`}
            >
                <div
                    className={cn('h-full rounded-full', negative ? 'bg-negative' : 'bg-ink')}
                    style={{ width: `${usedPct}%` }}
                />
                {elapsedPct !== null && (
                    <span
                        aria-hidden="true"
                        className="absolute -top-1 -bottom-1 w-[2px] -translate-x-1/2 rounded-full bg-brand"
                        style={{ left: `${elapsedPct}%` }}
                    />
                )}
            </div>
            <p className="sr-only">
                {usedPct}% of this period's income used{elapsedPct !== null ? `, ${elapsedPct}% of the period gone` : ''}.
            </p>
            <div className="mt-2 flex items-center justify-between gap-3 text-[12px] text-muted-ink">
                {legend.map(l => (
                    <span key={l.label} className="truncate">
                        {l.label} <span className="font-semibold text-ink tabular-nums">{formatShortCurrency(l.amount)}</span>
                    </span>
                ))}
            </div>
        </section>
    )
}
