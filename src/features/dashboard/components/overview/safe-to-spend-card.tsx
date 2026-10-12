import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { calculateHealthScore } from '@/lib/calculate-health-score'
import { MIN_PROJECTION_DAYS } from '@/hooks/use-period-stats'
import { diffPct, type ComparableSpending } from '@/lib/comparable-spending'
import type { PeriodSummary } from '@/lib/period-summary'
import { PeriodTotals } from './period-totals'

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
    /** What the accounts hold, or what they held at the close for a closed period. */
    balance: number
    isActivePeriod: boolean
    /** Null while debts are still loading or failed: the health score waits rather than guess "no debt". */
    totalDebt: number | null
    /** What every "vs last period" here compares (a projection mid-period); null while it's too early. */
    comparable: ComparableSpending | null
    /** Debts failed to load, so the health score can't be worked out. */
    debtsFailed?: boolean
    onRetry?: () => void
}

/**
 * The overview's headline: what's safe to spend, where the income went, the period's net
 * against the last one, and the financial health score (its reasons open from its row).
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
    balance,
    isActivePeriod,
    totalDebt,
    comparable,
    debtsFailed = false,
    onRetry,
}: SafeToSpendCardProps) {
    const [reasonsOpen, setReasonsOpen] = useState(false)
    const isNegative = remaining < 0

    const net = totalIncome - totalSpending - totalSavings
    // Share of income not spent: what's left plus what went into savings.
    const unspent = totalIncome - totalSpending
    const savingsRate = totalIncome > 0 ? (unspent / totalIncome) * 100 : null
    const spending = comparable?.spending ?? null
    const projected = comparable?.projected ?? false
    // Unspent by the end of the period against how the last one ended.
    const unspentDiffAbs = previousSummary && spending !== null
        ? totalIncome - spending - previousSummary.unspent
        : null

    const health = useMemo(() => {
        if (totalDebt === null || spending === null) return null
        // Spending vs spending — the previous period's savings mustn't count as its spend.
        const expenseDiffPct = diffPct(spending, previousSummary?.spending)
        return calculateHealthScore({ totalIncome, totalSpending: spending, totalBalance, totalDebt, expenseDiffPct, projected })
    }, [totalIncome, totalBalance, totalDebt, spending, projected, previousSummary])

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
        <div className="card px-5 py-[22px] overflow-hidden">
            <p className="text-[11px] font-normal uppercase tracking-[.14em] text-muted-ink">
                Safe to spend
            </p>
            <p
                className={cn(
                    'mt-1.5 text-[38px] font-medium leading-none tracking-[-.03em] tabular-nums',
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

            {/* The legend below reads out the same amounts. */}
            <div aria-hidden="true" className="mt-4 flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-line-soft">
                {base > 0 && segments.map(s => (
                    <div key={s.key} className="h-full" style={{ width: `${(s.amount / base) * 100}%`, background: s.fill }} />
                ))}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px] lg:flex lg:flex-wrap lg:gap-x-5">
                {segments.map(s => (
                    <span key={s.key} className="flex items-center gap-1.5 min-w-0">
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.fill }} />
                        <span className="text-muted-ink truncate">{s.label}</span>
                        <span className="ml-auto font-medium text-ink tabular-nums lg:ml-1">{formatCurrency(s.amount)}</span>
                    </span>
                ))}
            </div>

            <div className="mt-4 border-t border-line-soft pt-3.5">
                <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
                    {/* On a phone the first question is "how much do I have?", so balances lead there;
                        desktop has the balances card beside this one and keeps the period net. */}
                    <Link to="/accounts" className="min-w-0 lg:hidden">
                        <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">
                            {isActivePeriod ? 'Balances' : 'Closing balance'}
                        </p>
                        <p className={cn(
                            'mt-1 flex items-center gap-1.5 text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums',
                            balance < 0 ? 'text-negative' : 'text-ink'
                        )}>
                            <span className="truncate">{formatCurrency(balance)}</span>
                            <ArrowRight className="h-[13px] w-[13px] shrink-0 text-muted-ink" />
                        </p>
                    </Link>
                    <div className="min-w-0 hidden lg:block">
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
                                    ? `${Math.round(savingsRate)}% of income unspent${isActivePeriod ? ' so far' : ''}`
                                    : `Overspent by ${Math.abs(Math.round(savingsRate))}% of income`}
                            </p>
                        )}
                        {unspentDiffAbs !== null && (
                            <p className="text-muted-ink">
                                {projected && 'On pace for '}
                                <span className={unspentDiffAbs < 0 ? 'text-negative' : 'text-positive'}>
                                    {unspentDiffAbs >= 0 ? '+' : ''}{formatCurrency(unspentDiffAbs)}
                                </span>
                                {' '}unspent vs last period
                            </p>
                        )}
                    </div>
                </div>

                {/* On a phone these move to the top of Analytics, keeping this card about the money. */}
                <PeriodTotals
                    totalIncome={totalIncome}
                    totalSpending={totalSpending}
                    totalSavings={totalSavings}
                    previousSummary={previousSummary}
                    comparable={comparable}
                    className="mt-3 hidden lg:grid"
                />
            </div>

            {/* Health closes the card as a full-width row; its reasons open in place. */}
            {health && (
                <div className="mt-4 -mx-5 -mb-[22px] border-t border-line-soft">
                    <button
                        type="button"
                        onClick={() => setReasonsOpen(o => !o)}
                        aria-expanded={reasonsOpen}
                        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-soft transition-colors"
                    >
                        <span className="text-[11px] uppercase tracking-[.14em] text-muted-ink shrink-0">Financial health</span>
                        <span aria-hidden="true" className="flex-1 h-1.5 rounded-full bg-line-soft overflow-hidden">
                            <span className="block h-full rounded-full" style={{ width: `${health.score}%`, backgroundColor: healthColor }} />
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums shrink-0" style={{ color: healthColor }}>
                            {health.score}<span className="sr-only"> out of 100</span> <span className="font-medium">· {health.label}</span>
                        </span>
                        <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 text-muted-ink transition-transform', reasonsOpen && 'rotate-180')} />
                    </button>
                    {reasonsOpen && (
                        <div className="px-5 pb-3.5 -mt-1 space-y-1">
                            {health.periodReasons.length > 0 && (
                                <p className="text-[12px] text-ink">
                                    <span className="text-muted-ink">This period:</span> {health.periodReasons.join(' · ')}
                                </p>
                            )}
                            {health.overallReasons.length > 0 && (
                                <p className="text-[12px] text-ink">
                                    {/* Debt and balances are only known as they stand now, even for a past period. */}
                                    <span className="text-muted-ink">{isActivePeriod ? 'Overall:' : 'Today:'}</span> {health.overallReasons.join(' · ')}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
            {!health && (totalDebt !== null || debtsFailed) && (
                <div className="mt-4 -mx-5 -mb-[22px] border-t border-line-soft flex items-center gap-3 px-5 py-3">
                    <span className="text-[11px] uppercase tracking-[.14em] text-muted-ink shrink-0">Financial health</span>
                    {debtsFailed ? (
                        <span role="alert" className="flex-1 flex items-center justify-end gap-2 text-[12px] text-muted-ink">
                            Couldn't load debts
                            {onRetry && (
                                <button type="button" onClick={onRetry} className="font-medium text-brand-ink underline underline-offset-2">
                                    Retry
                                </button>
                            )}
                        </span>
                    ) : (
                        <span className="flex-1 text-right text-[12px] text-muted-ink">Scored from day {MIN_PROJECTION_DAYS} of the period</span>
                    )}
                </div>
            )}
        </div>
    )
}
