import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { HeroGlow } from '@/components/hero'
import type { PeriodStats } from '@/hooks/use-period-stats'

interface LedgerHeroProps {
    stats: PeriodStats
}

function message(s: PeriodStats): { text: string; className: string } {
    if (s.isClosed) {
        const days = `${s.noSpendDays} no-spend day${s.noSpendDays === 1 ? '' : 's'}`
        return { text: `Averaged ${formatCurrency(Math.round(s.dailyAvg))} a day, with ${days}.`, className: 'text-ink' }
    }
    if (s.totalIncome === 0) {
        return { text: 'No income recorded yet. Add your salary to see what’s left to spend.', className: 'text-muted-ink' }
    }
    if (s.remaining < 0) {
        return { text: `You’ve spent ${formatCurrency(-s.remaining)} more than came in this period.`, className: 'text-negative' }
    }
    if (s.safeDaily !== null && s.daysRemaining !== null) {
        const daysLeft = s.daysRemaining + 1
        const allowance = formatCurrency(Math.floor(s.safeDaily))
        if (s.projectedClose !== null && s.projectedClose < 0 && s.runwayDays !== null) {
            const early = Math.max(1, daysLeft - s.runwayDays)
            return {
                text: `At ${formatShortCurrency(Math.round(s.dailyAvg))}/day you’d run out ~${early} day${early === 1 ? '' : 's'} early. Keep to ${allowance} a day to make it.`,
                className: 'text-warning',
            }
        }
        return {
            text: `About ${allowance} a day for the ${daysLeft} day${daysLeft === 1 ? '' : 's'} left${s.projectedClose !== null ? ' — you’re on pace.' : '.'}`,
            className: 'text-ink',
        }
    }
    return { text: `Spending ${formatCurrency(Math.round(s.dailyAvg))} a day on average so far.`, className: 'text-ink' }
}

/** What's left this period, where the money went, and the daily allowance that makes it last. */
export function LedgerHero({ stats }: LedgerHeroProps) {
    const { totalIncome, totalSpending, totalSavings, remaining, isClosed, daysElapsed, totalDays } = stats
    const msg = message(stats)
    // The composition bar is out of whichever is bigger, so overspending still fits.
    const base = Math.max(totalIncome, totalSpending + totalSavings, 1)
    const left = Math.max(0, remaining)

    return (
        <header className="card p-5 relative overflow-hidden">
            <HeroGlow />
            <div className="relative flex items-center justify-between mb-4">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">{isClosed ? 'Closed with' : 'Left this period'}</p>
                <p className="text-[11px] text-subtle-ink tabular-nums">
                    {isClosed ? `${daysElapsed} days` : `Day ${daysElapsed}${totalDays ? ` of ${totalDays}` : ''}`}
                </p>
            </div>

            <div className="relative">
                <p className={cn(
                    'text-[32px] lg:text-[26px] font-medium tracking-[-0.02em] leading-none tabular-nums',
                    remaining < 0 ? 'text-negative' : 'text-ink'
                )}>
                    {formatCurrency(remaining)}
                </p>
                <p className="text-[11px] text-muted-ink mt-2 tabular-nums">of {formatCurrency(totalIncome)} that came in</p>

                <div className="mt-4 flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-line-soft">
                    {totalSpending > 0 && <div className="h-full bg-ink/80" style={{ flexGrow: totalSpending / base }} />}
                    {totalSavings > 0 && <div className="h-full bg-info" style={{ flexGrow: totalSavings / base }} />}
                    {left > 0 && <div className="h-full bg-brand" style={{ flexGrow: left / base }} />}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                    <Stat dot="bg-ink/80" label="Spent" value={totalSpending} />
                    <Stat dot="bg-info" label="Saved" value={totalSavings} />
                    <Stat dot="bg-brand" label="Left" value={left} />
                </div>

                <p className={cn('mt-4 pt-3 border-t border-line-soft text-[12px] leading-relaxed', msg.className)}>{msg.text}</p>
            </div>
        </header>
    )
}

function Stat({ dot, label, value }: { dot: string; label: string; value: number }) {
    return (
        <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-ink">
                <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} /> {label}
            </p>
            <p className="text-[13px] font-medium text-ink tabular-nums truncate mt-0.5">{formatShortCurrency(value)}</p>
        </div>
    )
}
