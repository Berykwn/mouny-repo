import { useMemo, useState, type ElementType, type ReactNode, type SVGProps } from 'react'
import TrendingUp from '~icons/ph/trend-up-duotone'
import TrendingDown from '~icons/ph/trend-down-duotone'
import PiggyBankIcon from '~icons/ph/piggy-bank-duotone'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { calculateHealthScore } from '@/lib/calculate-health-score'
import type { PeriodSummary } from '@/lib/period-summary'

interface SafeToSpendCardProps {
    totalIncome: number
    /** Expenses minus savings. */
    totalSpending: number
    totalSavings: number
    remaining: number
    /** Bills still due this period, already out of remaining. */
    reservedBills?: number
    unpaidBills?: number
    previousSummary: PeriodSummary | null
    totalBalance: number
    /** Null while debts are still loading or failed: the health score waits rather than guess "no debt". */
    totalDebt: number | null
}

/**
 * The overview's headline: what's safe to spend, where the income went, the period's net
 * against the last one, and the financial health score (its reasons open from the ring).
 */
export function SafeToSpendCard({
    totalIncome,
    totalSpending,
    totalSavings,
    remaining,
    reservedBills = 0,
    unpaidBills = 0,
    previousSummary,
    totalBalance,
    totalDebt,
}: SafeToSpendCardProps) {
    const [reasonsOpen, setReasonsOpen] = useState(false)
    const isNegative = remaining < 0

    const net = totalIncome - totalSpending - totalSavings
    // Share of income not spent: what's left plus what went into savings.
    const unspent = totalIncome - totalSpending
    const savingsRate = totalIncome > 0 ? (unspent / totalIncome) * 100 : null
    const unspentDiffAbs = previousSummary ? unspent - previousSummary.unspent : null

    // Spending vs spending — the previous period's savings mustn't count as its spend.
    const expenseDiffPct = previousSummary && previousSummary.spending > 0
        ? Math.round(((totalSpending - previousSummary.spending) / previousSummary.spending) * 100)
        : null
    const incomeDiffPct = previousSummary && previousSummary.income > 0
        ? Math.round(((totalIncome - previousSummary.income) / previousSummary.income) * 100)
        : null

    const health = useMemo(() => totalDebt === null ? null : calculateHealthScore({
        totalIncome,
        totalSpending,
        totalBalance,
        totalDebt,
        expenseDiffPct,
    }), [totalIncome, totalSpending, totalBalance, totalDebt, expenseDiffPct])

    const healthColor = !health ? 'var(--line)'
        : health.score >= 80 ? 'var(--positive)'
            : health.score >= 60 ? 'var(--brand-ink)'
                : health.score >= 40 ? 'var(--warning)'
                    : 'var(--negative)'

    // One bar of income: spent, saved, held for bills, and what's left to spend.
    const safe = Math.max(0, remaining)
    const base = Math.max(totalIncome, totalSpending + totalSavings + reservedBills)
    const segments = [
        { key: 'spent', label: 'Spent', amount: totalSpending, fill: isNegative ? 'var(--negative)' : 'var(--ink)' },
        { key: 'saved', label: 'Saved', amount: totalSavings, fill: 'var(--info)' },
        // Hatched: held back, not gone yet.
        {
            key: 'bills',
            label: `${unpaidBills} bill${unpaidBills === 1 ? '' : 's'} due`,
            amount: reservedBills,
            fill: 'repeating-linear-gradient(135deg, var(--warning) 0 3px, color-mix(in srgb, var(--warning) 45%, transparent) 3px 6px)',
        },
        { key: 'safe', label: 'Safe', amount: safe, fill: 'var(--brand)' },
    ].filter(s => s.amount > 0)

    return (
        <div className="card px-5 py-[22px]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-normal uppercase tracking-[.14em] text-muted-ink">
                        Safe to spend
                    </p>
                    <p
                        className={cn(
                            // Scales down on narrow phones so a 7–8 digit amount clears the health ring.
                            'mt-1.5 text-[clamp(28px,9vw,38px)] font-medium leading-none tracking-[-.03em] tabular-nums',
                            isNegative ? 'text-negative' : 'text-ink'
                        )}
                    >
                        {formatCurrency(remaining)}
                    </p>
                    {reservedBills > 0 && (
                        <p className="mt-1.5 text-[11.5px] text-muted-ink">
                            {formatCurrency(reservedBills)} set aside for {unpaidBills} bill{unpaidBills === 1 ? '' : 's'} still due
                        </p>
                    )}
                </div>

                {health && (
                    <button
                        type="button"
                        onClick={() => setReasonsOpen(o => !o)}
                        aria-expanded={reasonsOpen}
                        aria-label={`Financial health ${health.score}, ${health.label}. ${reasonsOpen ? 'Hide' : 'Show'} why`}
                        className="shrink-0 h-14 w-14 rounded-full p-[5px]"
                        style={{ background: `conic-gradient(${healthColor} 0 ${health.score}%, var(--line-soft) ${health.score}% 100%)` }}
                    >
                        <span className="flex h-full w-full flex-col items-center justify-center rounded-full bg-surface leading-none">
                            <span className="text-[17px] font-semibold tabular-nums" style={{ color: healthColor }}>{health.score}</span>
                            <span className="mt-0.5 text-[8.5px] font-semibold" style={{ color: healthColor }}>{health.label}</span>
                        </span>
                    </button>
                )}
            </div>

            {health && reasonsOpen && (health.periodReasons.length > 0 || health.overallReasons.length > 0) && (
                <div className="mt-3 rounded-[12px] bg-surface-soft border border-line-soft px-3 py-2.5 space-y-1">
                    <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Financial health</p>
                    {health.periodReasons.length > 0 && (
                        <p className="text-[12px] text-ink">
                            <span className="text-muted-ink">This period:</span> {health.periodReasons.join(' · ')}
                        </p>
                    )}
                    {health.overallReasons.length > 0 && (
                        <p className="text-[12px] text-ink">
                            <span className="text-muted-ink">Overall:</span> {health.overallReasons.join(' · ')}
                        </p>
                    )}
                </div>
            )}

            <div className="mt-4 flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-line-soft">
                {base > 0 && segments.map(s => (
                    <div key={s.key} className="h-full" style={{ width: `${(s.amount / base) * 100}%`, background: s.fill }} />
                ))}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px] lg:flex lg:flex-wrap lg:gap-x-5">
                {segments.map(s => (
                    <span key={s.key} className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.fill }} />
                        <span className="text-muted-ink truncate">{s.label}</span>
                        <span className="ml-auto font-medium text-ink tabular-nums lg:ml-1">{formatCurrency(s.amount)}</span>
                    </span>
                ))}
            </div>

            <div className="mt-4 border-t border-line-soft pt-3.5">
                <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
                    <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Period net</p>
                        <p className={cn(
                            'mt-1 text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums truncate',
                            net < 0 ? 'text-negative' : 'text-ink'
                        )}>
                            {net >= 0 ? '+' : ''}{formatCurrency(net)}
                        </p>
                    </div>
                    <div className="text-[11.5px] leading-snug sm:text-right">
                        {savingsRate !== null && (
                            <p className={savingsRate < 0 ? 'text-negative' : 'text-positive'}>
                                {savingsRate >= 0
                                    ? `${Math.round(savingsRate)}% of income unspent`
                                    : `Overspent by ${Math.abs(Math.round(savingsRate))}% of income`}
                            </p>
                        )}
                        {unspentDiffAbs !== null && (
                            <p className="text-muted-ink">
                                <span className={unspentDiffAbs < 0 ? 'text-negative' : 'text-positive'}>
                                    {unspentDiffAbs >= 0 ? '+' : ''}{formatCurrency(unspentDiffAbs)}
                                </span>
                                {' '}unspent vs last period
                            </p>
                        )}
                    </div>
                </div>

                {/* Rows on a phone, where three full IDR amounts can't sit side by side. */}
                <div className={cn(
                    'mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-line-soft bg-line-soft',
                    totalSavings > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                )}>
                    <SummaryCell
                        icon={TrendingUp}
                        tone="bg-positive/10 text-positive"
                        valueClassName="text-positive"
                        label="Income"
                        value={formatCurrency(totalIncome)}
                        diff={previousSummary ? <DiffValue pct={incomeDiffPct} goodWhenUp /> : null}
                    />
                    <SummaryCell
                        icon={TrendingDown}
                        tone="bg-negative/10 text-negative"
                        valueClassName="text-negative"
                        label={totalSavings > 0 ? 'Spent' : 'Expense'}
                        value={formatCurrency(totalSpending)}
                        diff={previousSummary ? <DiffValue pct={expenseDiffPct} goodWhenUp={false} /> : null}
                    />
                    {totalSavings > 0 && (
                        <SummaryCell
                            icon={PiggyBankIcon}
                            tone="bg-info/10 text-info"
                            valueClassName="text-info"
                            label="To savings"
                            value={formatCurrency(totalSavings)}
                            diff={totalIncome > 0
                                ? <span className="text-muted-ink">{Math.round((totalSavings / totalIncome) * 100)}% of income</span>
                                : null}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

interface SummaryCellProps {
    /** A duotone icon on a tinted plate, like a category tile. */
    icon: ElementType<SVGProps<SVGSVGElement>>
    /** The plate's tint and the icon's color, e.g. 'bg-positive/10 text-positive'. */
    tone: string
    valueClassName: string
    label: string
    value: string
    diff: ReactNode
}

function SummaryCell({ icon: Icon, tone, valueClassName, label, value, diff }: SummaryCellProps) {
    return (
        <div className="bg-surface-soft p-2.5 min-w-0 flex items-center gap-2.5">
            <span className={cn('h-9 w-9 shrink-0 rounded-[11px] flex items-center justify-center', tone)}>
                <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-ink leading-none">{label}</p>
                <p className={cn('mt-1 text-[13.5px] font-medium tabular-nums truncate', valueClassName)}>{value}</p>
                {diff && <p className="mt-0.5 text-[10.5px] truncate">{diff}</p>}
            </div>
        </div>
    )
}

function DiffValue({ pct, goodWhenUp }: { pct: number | null; goodWhenUp: boolean }) {
    if (pct === null) return <span className="text-muted-ink">—</span>
    if (pct === 0) return <span className="text-muted-ink">same as last</span>
    const isUp = pct > 0
    const Icon = isUp ? TrendingUp : TrendingDown
    return (
        <span className={cn('inline-flex items-center gap-1', isUp === goodWhenUp ? 'text-positive' : 'text-negative')}>
            <Icon className="h-3 w-3" />
            {isUp ? '+' : ''}{pct}% vs last
        </span>
    )
}
