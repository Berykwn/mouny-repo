import { useMemo } from 'react'
import { formatPeriodLabel, formatShortCurrency } from '@/lib/helpers'
import type { PeriodStats } from '@/hooks/use-period-stats'
import { PeriodTrendChart } from '@/features/dashboard/components/analytics/period-trend-chart'
import { PeriodRange } from '@/features/dashboard/components/analytics/period-analytics'
import type { TrendPoint } from '@/features/dashboard/hooks/use-period-trend'
import type { PayPeriod } from '@/types'
import { median, RATE_GUIDE, type RatePoint } from '../lib/analysis'
import { BlockNote, Em, InsightBlock } from './insight-block'
import { BalanceTrendChart, RateChart } from './charts'

interface TrendsTabProps {
    period: PayPeriod
    periods: PayPeriod[]
    stats: PeriodStats
    trend: { trend: TrendPoint[]; loading: boolean; failed: boolean; retry: () => void }
    /** What the accounts hold now. */
    totalBalance: number
}

const pct = (rate: number) => `${Math.round(rate * 100)}%`

/** How the periods compare: the share kept, the money in and out, and the balances at each close. */
export function TrendsTab({ period, periods, stats, trend, totalBalance }: TrendsTabProps) {
    const points = trend.trend
    const closed = stats.isClosed
    // An open period's unspent-so-far would beat every full period early on, so it counts
    // where its pace ends it; until there's a projection, not at all.
    const current = closed
        ? stats.totalIncome - stats.totalSpending
        : stats.projectedClose !== null ? stats.projectedClose + stats.totalSavings : null

    const rates = useMemo((): RatePoint[] => points.map(t => {
        const selected = t.periodId === period.id
        const unspent = selected ? current : t.unspent
        return {
            periodId: t.periodId,
            label: t.label,
            rate: unspent !== null && t.income > 0 ? unspent / t.income : null,
            projected: t.isCurrent,
        }
    }), [points, period.id, current])
    const selectedRate = rates.find(r => r.periodId === period.id)?.rate ?? null
    const others = rates.filter(r => r.periodId !== period.id && !r.projected && r.rate !== null)
    const usualRate = median(others.map(r => r.rate!))
    const metGuide = others.filter(r => r.rate! >= RATE_GUIDE).length

    const comparison = useMemo(() => {
        const rest = points.filter(t => t.periodId !== period.id)
        if (rest.length === 0) return null
        // Ranked by unspent, so a period that moved money into savings isn't marked down for it.
        const best = rest.reduce((mx, t) => t.unspent > mx.unspent ? t : mx, rest[0])
        const worst = rest.reduce((mn, t) => t.unspent < mn.unspent ? t : mn, rest[0])
        const usual = median(rest.map(t => t.unspent))!
        const beaten = current === null ? 0 : rest.filter(t => current > t.unspent).length
        return { best, worst, usual, beaten, count: rest.length }
    }, [points, period.id, current])

    // Balances at each close, oldest first, and today for the open period.
    const balances = useMemo(() => {
        const closes = periods
            .filter(p => p.status === 'closed' && p.closing_balance !== null)
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
            .slice(-6)
            .map(p => ({ label: formatPeriodLabel(p.start_date), balance: p.closing_balance!, now: false }))
        const active = periods.find(p => p.status === 'active')
        return active ? [...closes.slice(-5), { label: formatPeriodLabel(active.start_date), balance: totalBalance, now: true }] : closes
    }, [periods, totalBalance])
    const balanceChange = balances.length >= 2 ? balances[balances.length - 1].balance - balances[0].balance : null

    return (
        <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
            <InsightBlock
                kicker="Savings rate"
                title={selectedRate === null
                    ? closed ? 'This period had no income to keep a share of.' : 'Too early to tell what share you’ll keep.'
                    : <>
                        {closed ? 'You kept ' : 'On pace to keep '}
                        <Em tone={selectedRate < 0 ? 'negative' : 'brand'}>{pct(selectedRate)} of income</Em>
                        {usualRate !== null ? <>, against your usual {pct(usualRate)}.</> : '.'}
                    </>}
                sub={others.length > 0
                    ? `Share of income not spent: saved plus left over. ${metGuide} of your other ${others.length} period${others.length === 1 ? '' : 's'} reached the ${pct(RATE_GUIDE)} guide.`
                    : 'Share of income not spent: saved plus left over.'}
                how="(Income − spending) ÷ income for each period; savings count as kept. The open period is where its pace ends it (hollow dot). “Your usual” is the median of the other closed periods shown."
            >
                {trend.loading ? <BlockNote>Loading your periods…</BlockNote>
                    : trend.failed ? <RetryNote onRetry={trend.retry} />
                        : rates.filter(r => r.rate !== null).length >= 2 ? <RateChart points={rates} guide={RATE_GUIDE} />
                            : <BlockNote>The trend appears once you’ve completed a full pay period.</BlockNote>}
            </InsightBlock>

            <InsightBlock
                kicker="Money in and out"
                title={!comparison
                    ? 'Your other periods will show here once you have some.'
                    : current === null
                        ? 'Too early to compare with your other periods.'
                        : <>{closed ? 'Better than ' : 'On pace to beat '}<Em>{comparison.beaten} of your other {comparison.count}</Em> period{comparison.count === 1 ? '' : 's'}.</>}
                sub={comparison ? 'Ranked by income left unspent.' : undefined}
                how="Income, everything that went out (savings included) and the net per period, for your last 6 periods at most. The ranking compares what each period left unspent; the open one by where its pace ends it. The middle tick is the median of the others."
            >
                <PeriodTrendChart trend={points} loading={trend.loading} failed={trend.failed} onRetry={trend.retry} />
                {comparison && current !== null && (
                    <PeriodRange
                        worst={comparison.worst.unspent}
                        best={comparison.best.unspent}
                        average={comparison.usual}
                        current={current}
                        currentLabel={closed ? 'This period' : 'This period, projected'}
                        worstText={`${comparison.worst.label} · ${formatShortCurrency(comparison.worst.unspent)}`}
                        bestText={`${comparison.best.label} · ${formatShortCurrency(comparison.best.unspent)}`}
                    />
                )}
            </InsightBlock>

            <InsightBlock
                kicker="Balances"
                title={balanceChange === null
                    ? 'Close a period to start the balance trend.'
                    : <>{balanceChange >= 0 ? 'Up ' : 'Down '}<Em tone={balanceChange < 0 ? 'negative' : 'brand'}>{formatShortCurrency(Math.abs(balanceChange))} since {balances[0].label}</Em>, across all your accounts.</>}
                sub={balances.length >= 2 ? `What your accounts held at each period’s close${balances[balances.length - 1].now ? ', and today' : ''}.` : undefined}
                how="Every account, savings included, as it stood when each period was closed; the open period shows today’s balances. Debts aren’t taken off, since what you owed at each close isn’t kept."
                className="lg:col-span-2"
            >
                {balances.length >= 2 && <BalanceTrendChart points={balances} />}
            </InsightBlock>
        </div>
    )
}

function RetryNote({ onRetry }: { onRetry: () => void }) {
    return (
        <p role="alert" className="py-4 text-[13px] text-muted-ink">
            Couldn’t load your other periods.{' '}
            <button type="button" onClick={onRetry} className="font-medium text-brand-ink underline underline-offset-2">Retry</button>
        </p>
    )
}
