import type { ElementType, ReactNode, SVGProps } from 'react'
import TrendingUp from '~icons/ph/trend-up-duotone'
import TrendingDown from '~icons/ph/trend-down-duotone'
import PiggyBankIcon from '~icons/ph/piggy-bank-duotone'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { diffPct, type ComparableSpending } from '@/lib/comparable-spending'
import type { PeriodSummary } from '@/lib/period-summary'

interface PeriodTotalsProps {
    totalIncome: number
    /** Expenses minus savings. */
    totalSpending: number
    totalSavings: number
    previousSummary: PeriodSummary | null
    /** The spending that stands against the last period (a projection mid-period); null while it's too early. */
    comparable: ComparableSpending | null
    className?: string
}

/** Income, spent and to-savings tiles, each against the last period. */
export function PeriodTotals({ totalIncome, totalSpending, totalSavings, previousSummary, comparable, className }: PeriodTotalsProps) {
    // Spending vs spending — the previous period's savings mustn't count as its spend.
    const expenseDiffPct = comparable ? diffPct(comparable.spending, previousSummary?.spending) : null
    const incomeDiffPct = diffPct(totalIncome, previousSummary?.income)

    return (
        // Rows on a phone, where three full IDR amounts can't sit side by side.
        <div className={cn(
            'grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-line-soft bg-line-soft',
            totalSavings > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
            className
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
                diff={!previousSummary ? null
                    : !comparable ? <span className="text-muted-ink">too early to compare</span>
                        : <DiffValue pct={expenseDiffPct} goodWhenUp={false} onPace={comparable.projected} />}
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
    )
}

/** The same tiles as a card of their own, for the phone's analytics section. */
export function PeriodTotalsCard(props: Omit<PeriodTotalsProps, 'className'>) {
    return (
        <div className="card p-4">
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink mb-3">This period</p>
            <PeriodTotals {...props} />
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
                <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-ink leading-none">{label}</p>
                <p className={cn('mt-1 text-[13.5px] font-medium tabular-nums truncate', valueClassName)}>{value}</p>
                {diff && <p className="mt-0.5 text-[10.5px] truncate">{diff}</p>}
            </div>
        </div>
    )
}

/** onPace: the change is where this period's pace ends it, not what's happened so far. */
function DiffValue({ pct, goodWhenUp, onPace = false }: { pct: number | null; goodWhenUp: boolean; onPace?: boolean }) {
    if (pct === null) return <span className="text-muted-ink">—</span>
    if (pct === 0) return <span className="text-muted-ink">{onPace ? 'on pace to match last' : 'same as last'}</span>
    const isUp = pct > 0
    const Icon = isUp ? TrendingUp : TrendingDown
    return (
        <span className={cn('inline-flex items-center gap-1', isUp === goodWhenUp ? 'text-positive' : 'text-negative')}>
            <Icon aria-hidden="true" className="h-3 w-3" />
            {onPace && 'on pace '}{isUp ? '+' : ''}{pct}% vs last
        </span>
    )
}
