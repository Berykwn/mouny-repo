import { useMemo } from 'react'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { calculateHealthScore } from '@/lib/calculate-health-score'
import { diffPct, type ComparableSpending } from '@/lib/comparable-spending'
import { summarizeTransactions } from '@/lib/period-summary'
import { withSavingsMoves } from '@/lib/savings-moves'
import { MIN_PROJECTION_DAYS, type PeriodStats } from '@/hooks/use-period-stats'
import { CategoryTile } from '@/features/categories/components/category-icon'
import { dayDate } from '@/features/bills/lib/bill-labels'
import { txTitle } from '@/features/transactions/lib/ledger'
import { CategoryBreakdown } from '@/features/dashboard/components/analytics/period-analytics'
import { KindSplitChart } from '@/features/dashboard/components/analytics/kind-split-card'
import { kindSplit } from '@/features/dashboard/lib/kind-split'
import { groupExpensesByCategory } from '@/features/dashboard/lib/group-expenses-by-category'
import type { OverviewData } from '@/types/overview.types'
import {
    categoryVariance, forecastKept, median, paceSeries, standOuts, STAND_OUT_MULTIPLE, USUAL_PERIODS,
    type PastPeriod,
} from '../lib/analysis'
import { Em, InsightBlock } from './insight-block'
import { PaceChart, VarianceChart } from './charts'

interface ThisPeriodTabProps {
    data: OverviewData
    stats: PeriodStats
    comparable: ComparableSpending | null
    /** Null while the earlier periods load. */
    history: PastPeriod[] | null
}

const pct = (share: number) => `${Math.round(share * 100)}%`
const NUMBER_WORDS = ['No', 'One', 'Two', 'Three']

/** "2,1×": one decimal, Indonesian comma, no ".0". */
const times = (n: number) => `${n >= 10 ? Math.round(n) : n.toFixed(1).replace('.0', '').replace('.', ',')}×`

/** Where this period is going, what's unusual in it, and where its money went. */
export function ThisPeriodTab({ data, stats, comparable, history }: ThisPeriodTabProps) {
    const { period, transactions } = data
    const closed = stats.isClosed
    const forecast = useMemo(() => forecastKept(stats, period.start_date, transactions), [stats, period.start_date, transactions])
    const kept = closed ? stats.totalIncome - stats.totalSpending : forecast?.kept ?? null
    const keptRate = kept !== null && stats.totalIncome > 0 ? kept / stats.totalIncome : null

    // Your usual: the median share of income kept over the earlier closed periods.
    const usualRate = useMemo(() => {
        if (!history) return null
        return median(history
            .map(p => summarizeTransactions(p.transactions))
            .filter(s => s.income > 0)
            .map(s => s.unspent / s.income))
    }, [history])

    // The grey band compares like with like: the last three closed periods by the same day.
    const bandHistory = useMemo(() => history?.slice(0, 3) ?? [], [history])
    const points = useMemo(
        () => paceSeries(stats, period.start_date, transactions, bandHistory),
        [stats, period.start_date, transactions, bandHistory]
    )

    const health = useMemo(() => {
        if (data.totalDebt === null || !comparable) return null
        const expenseDiffPct = diffPct(comparable.spending, data.previousSummary?.spending)
        return calculateHealthScore({
            totalIncome: stats.totalIncome,
            totalSpending: comparable.spending,
            totalBalance: data.totalBalance,
            totalDebt: data.totalDebt,
            expenseDiffPct,
            projected: comparable.projected,
        })
    }, [data.totalDebt, data.totalBalance, data.previousSummary, comparable, stats.totalIncome])

    const variance = useMemo(
        () => history && (closed || stats.daysElapsed >= MIN_PROJECTION_DAYS) ? categoryVariance(stats, transactions, history) : null,
        [history, closed, stats, transactions]
    )
    const outs = useMemo(() => history ? standOuts(transactions, history) : null, [history, transactions])

    // Money moved into savings accounts counts as saved, like a savings expense.
    const expenses = useMemo(() => withSavingsMoves(transactions).filter(t => t.type === 'expense'), [transactions])
    const topCategory = useMemo(() => groupExpensesByCategory(expenses)[0] ?? null, [expenses])
    const split = useMemo(() => kindSplit(expenses, stats.totalIncome), [expenses, stats.totalIncome])

    const usualText = usualRate !== null && keptRate !== null
        ? ` ${keptRate >= usualRate ? 'At or above' : 'Below'} your usual ${pct(usualRate)}.`
        : ''

    return (
        <div className="lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-4 lg:items-start">
            {/* Numbers first on a phone; on a desktop they sit beside the forecast's neighbours. */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-line bg-line lg:order-4 lg:self-start">
                <Kpi label="Spent so far" value={formatShortCurrency(stats.totalSpending)} hint={stats.totalSavings > 0 ? `+ ${formatShortCurrency(stats.totalSavings)} saved` : 'savings not counted'} />
                <Kpi label="Daily pace" value={formatShortCurrency(stats.dailyAvg)} hint="everyday, per day" />
                <Kpi
                    label={closed ? 'Kept' : 'Forecast kept'}
                    value={kept === null ? '—' : formatShortCurrency(kept)}
                    hint={keptRate !== null ? `${pct(keptRate)} of income` : closed ? 'no income' : 'from day 3'}
                    tone={kept !== null && kept < 0 ? 'negative' : 'brand'}
                />
                <Kpi
                    label="Health"
                    value={health ? String(health.score) : '—'}
                    hint={health ? health.label : data.totalDebt === null ? 'waiting for debts' : `from day ${MIN_PROJECTION_DAYS}`}
                    title={health ? [...health.periodReasons, ...health.overallReasons].join(' · ') : undefined}
                />
            </div>

            <InsightBlock
                className="lg:order-1"
                kicker={closed ? 'How it ended' : 'Forecast'}
                title={closed
                    ? kept === null || stats.totalIncome <= 0
                        ? <>This period had no income to keep.</>
                        : kept >= 0
                            ? <>You kept <Em>{formatShortCurrency(kept)}</Em>, {pct(keptRate!)} of income.</>
                            : <>You spent <Em tone="negative">{formatShortCurrency(-kept)} more</Em> than came in.</>
                    : !forecast
                        ? <>Too early to forecast: a few days of spending first.</>
                        : forecast.kept >= 0
                            ? <>You’ll likely end with <Em>{formatShortCurrency(forecast.kept)} kept</Em>{forecast.rate !== null && <>, about {pct(forecast.rate)} of income</>}.</>
                            : <>At this pace you’ll end <Em tone="negative">{formatShortCurrency(-forecast.kept)} short</Em> of your income.</>}
                sub={closed
                    ? usualText.trim() || undefined
                    : forecast ? <>Range {formatShortCurrency(forecast.low)} – {formatShortCurrency(forecast.high)}.{usualText}</> : undefined}
                how={<>
                    Spending so far (savings left out). {!closed && <>For the days left, your everyday pace so far ({formatCurrency(stats.dailyAvg)}/day) carries on, bills and one-offs counted once, and bills still due are added. The range is ± one standard deviation of daily everyday spending over the days left. </>}
                    {bandHistory.length > 0 && <>The grey band runs from the least to the most your last {bandHistory.length} closed period{bandHistory.length === 1 ? '' : 's'} had spent by the same day. </>}
                    “Your usual” is the median over your last {USUAL_PERIODS} closed periods, at most.
                    {stats.isEndDateEstimated && <> This period has no end date yet, so it’s assumed to run {stats.totalDays} days, like the last one.</>}
                </>}
            >
                <PaceChart
                    points={points}
                    income={stats.totalIncome}
                    todayDay={closed ? null : stats.daysElapsed}
                    bandLabel={bandHistory.length > 0 ? `Last ${bandHistory.length} period${bandHistory.length === 1 ? '' : 's'}` : null}
                />
            </InsightBlock>

            <InsightBlock
                className="lg:order-2"
                kicker="Unusual for you"
                title={variance === null
                    ? history === null ? 'Comparing with your usual…' : history.length === 0 ? 'Your usual appears after your first closed period.' : 'A few more days before comparing.'
                    : variance.length === 0
                        ? 'Every category is close to your usual.'
                        : <VarianceTitle rows={variance} />}
                sub={variance && variance.length > 0 ? `Each everyday and lifestyle category ${closed ? 'this period' : 'on pace for this period'}, against its median over your last ${history!.length} closed period${history!.length === 1 ? '' : 's'}.` : undefined}
                how={<>
                    {closed ? 'This period’s total' : 'Projected total = spent so far ÷ days passed × days in the period'} per category, against the median of the same category over your last {USUAL_PERIODS} closed periods at most (a period without it counts as zero). Bills and savings are left out, and changes within 5% are hidden.
                </>}
            >
                {variance && variance.length > 0 && <VarianceChart rows={[...variance.filter(r => r.pct > 0).slice(0, 3), ...variance.filter(r => r.pct < 0).slice(-3)]} />}
            </InsightBlock>

            <InsightBlock
                className="lg:order-3"
                kicker="Stand-out transactions"
                title={outs === null
                    ? 'Looking for stand-outs…'
                    : outs.length === 0
                        ? 'Nothing stood out from what you usually spend.'
                        : <>{NUMBER_WORDS[outs.length]} entr{outs.length === 1 ? 'y was' : 'ies were'} far above what you normally spend on {outs.length === 1 ? 'it' : 'them'}.</>}
                how={`Each everyday and lifestyle entry against the median single entry in its category over your last ${USUAL_PERIODS} closed periods at most (with at least 3 entries there). Flagged at ${STAND_OUT_MULTIPLE}× or more.`}
            >
                {outs && outs.length > 0 && (
                    <div>
                        {outs.map(({ tx, multiple }) => (
                            <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft last:border-b-0">
                                <CategoryTile category={tx.category} className="w-10 h-10 rounded-[12px]" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] text-ink">{txTitle(tx)}</p>
                                    <p className="truncate text-[12px] text-muted-ink">
                                        {tx.category?.name ?? 'Uncategorized'} · {dayDate(tx.date.slice(0, 10))} · {formatCurrency(tx.amount)}
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-negative/10 px-2.5 py-1 text-[12px] font-semibold text-negative tabular-nums">
                                    {times(multiple)} usual
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </InsightBlock>

            <InsightBlock
                className="lg:order-5"
                kicker="Where it went"
                title={topCategory && stats.totalExpense > 0
                    ? <>{topCategory.name} took the most: <Em>{pct(topCategory.amount / stats.totalExpense)}</Em> of what went out.</>
                    : 'Nothing has gone out yet this period.'}
                sub={topCategory ? 'Tap a category for its transactions.' : undefined}
                how="Every expense this period by category, savings included. Budgets near or over their amount come first."
            >
                <CategoryBreakdown expenses={expenses} totalExpense={stats.totalExpense} />
            </InsightBlock>

            {split.totalExpense > 0 && (
                <InsightBlock
                    className="lg:order-6"
                    kicker="Needs · Wants · Savings"
                    title={split.hasIncome
                        ? <>Needs took <Em>{split.pctOf(split.needs)}%</Em> of income, wants {split.pctOf(split.byKind.lifestyle)}%, savings {split.pctOf(split.byKind.savings)}%.</>
                        : 'No income yet: these are shares of what went out.'}
                    how="By each category’s kind: needs are bills plus everyday spending, wants are lifestyle, savings are set aside. The 50/30/20 guide keeps needs at most half of income, wants at most 30%, and savings at least 20%. Uncategorized counts as everyday."
                >
                    <KindSplitChart split={split} totalIncome={stats.totalIncome} isClosed={closed} />
                </InsightBlock>
            )}
        </div>
    )
}

function VarianceTitle({ rows }: { rows: { name: string; pct: number }[] }) {
    const up = rows.find(r => r.pct > 0)
    const down = [...rows].reverse().find(r => r.pct < 0)
    return (
        <>
            {up && <><Em tone="warning">{up.name} is {up.pct}% above</Em> your usual.</>}
            {up && down && ' '}
            {down && <>{down.name} is {-down.pct}% below{up ? '' : ' your usual'}.</>}
        </>
    )
}

function Kpi({ label, value, hint, tone, title }: { label: string; value: string; hint: string; tone?: 'brand' | 'negative'; title?: string }) {
    return (
        <div className="bg-surface px-4 py-3.5 min-w-0" title={title}>
            <p className="text-[12.5px] text-muted-ink">{label}</p>
            <p className={cn(
                'mt-0.5 text-[24px] font-semibold leading-tight tracking-[-0.02em] tabular-nums truncate',
                tone === 'negative' ? 'text-negative' : tone === 'brand' ? 'text-brand-ink' : 'text-ink'
            )}>
                {value}
            </p>
            <p className="text-[12px] text-subtle-ink truncate">{hint}</p>
        </div>
    )
}
