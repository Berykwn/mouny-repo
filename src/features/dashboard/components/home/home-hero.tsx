import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { PeriodStats } from '@/hooks/use-period-stats'
import { HERO_STATUS_LABEL, heroNumbers, type HeroSignals, type HeroStatus } from '../../lib/home'

const STATUS_DOT: Record<HeroStatus, string> = {
    'on-track': 'bg-brand',
    tight: 'bg-warning',
    overdue: 'bg-warning',
    short: 'bg-negative',
    over: 'bg-negative',
    closed: 'bg-subtle-ink',
}

/**
 * "What's left?" in one number, with a word for how it's going and one thin bar: how much
 * of the income is used, and a tick where today sits in the period.
 *
 * "Left" means one thing everywhere: income less everything spent or saved, less the bills
 * still due this period. The daily number is that, spread over the days to payday.
 */
export function HomeHero({ stats, signals }: { stats: PeriodStats; signals?: HeroSignals }) {
    const hero = heroNumbers(stats, signals)
    const closed = hero.status === 'closed'
    const negative = hero.today < 0
    const usedPct = Math.round(hero.used * 100)
    const elapsedPct = hero.elapsed !== null ? Math.round(hero.elapsed * 100) : null
    const daily = !closed && !hero.pastPayday && hero.daysLeft !== null
    const remainingClass = cn('font-semibold', stats.remaining < 0 ? 'text-negative' : 'text-ink')
    // Said where the number is, so "Left" never needs a footnote.
    const billsNote = stats.reservedBills > 0
        ? <>, after <span className="font-semibold text-ink">{formatCurrency(stats.reservedBills)}</span> held back for bills still due</>
        : null

    const legend = [
        { label: 'Spent', amount: stats.totalSpending },
        { label: 'Saved', amount: stats.totalSavings },
        { label: 'Bills due', amount: stats.reservedBills },
    ].filter(l => l.amount > 0 || l.label === 'Spent')

    return (
        <section aria-label="Left to spend" className="pt-1">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-muted-ink">
                    {closed ? 'Left at the end of the period'
                        : hero.pastPayday ? 'Past your usual payday'
                            : daily ? 'Left for today' : 'Left this period'}
                </p>
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                    <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', STATUS_DOT[hero.status])} />
                    {HERO_STATUS_LABEL[hero.status]}
                </p>
            </div>

            <p className={cn(
                'mt-1.5 text-[44px] lg:text-[56px] font-semibold leading-none tracking-[-.035em] tabular-nums',
                negative ? 'text-negative' : 'text-ink'
            )}>
                {formatCurrency(hero.today)}
            </p>

            {daily && hero.daysLeft! > 1 ? (
                <p className="mt-2 text-[13.5px] text-muted-ink">
                    <span className={remainingClass}>{formatCurrency(stats.remaining)}</span>
                    {' '}left for the next {hero.daysLeft} days{billsNote}.
                </p>
            ) : !closed && (hero.pastPayday || billsNote) ? (
                // The end was only a guess from the last period's length; a daily number now
                // would be one too, so the hero shows what's left of the period.
                <p className="mt-2 text-[13.5px] text-muted-ink">
                    {daily ? 'Left today' : 'Left this period'}{billsNote}.
                </p>
            ) : null}

            {/* The legend reads out the amounts; the bar is for the eye. */}
            <div
                aria-hidden="true"
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
