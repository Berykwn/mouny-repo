import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { CATEGORY_KIND_META } from '@/lib/category-kind'
import { GUIDE, SEGMENTS, type KindSplit } from '../../lib/kind-split'

interface KindSplitChartProps {
    split: KindSplit
    totalIncome: number
    isClosed: boolean
}

/**
 * Where the period's income went, by what the money was for: needs (bills + everyday),
 * wants (lifestyle) and savings, against the 50/30/20 guide.
 */
export function KindSplitChart({ split, totalIncome, isClosed }: KindSplitChartProps) {
    const { byKind, totalExpense, hasIncome, pctOf, unspent, needs } = split
    if (totalExpense === 0) return null
    const base = hasIncome ? Math.max(totalIncome, totalExpense) : totalExpense

    const rows = [
        {
            key: 'needs',
            label: 'Needs',
            amount: needs,
            detail: `${CATEGORY_KIND_META.fixed.label} ${formatCurrency(byKind.fixed)} · ${CATEGORY_KIND_META.daily.label} ${formatCurrency(byKind.daily)}`,
            colors: [CATEGORY_KIND_META.fixed.color, CATEGORY_KIND_META.daily.color],
            guide: `≤ ${GUIDE.needs}%`,
            off: pctOf(needs) > GUIDE.needs,
        },
        {
            key: 'wants',
            label: 'Wants',
            amount: byKind.lifestyle,
            detail: CATEGORY_KIND_META.lifestyle.label,
            colors: [CATEGORY_KIND_META.lifestyle.color],
            guide: `≤ ${GUIDE.wants}%`,
            off: pctOf(byKind.lifestyle) > GUIDE.wants,
        },
        {
            key: 'savings',
            label: 'Savings',
            amount: byKind.savings,
            detail: !isClosed && unspent > 0 ? `plus ${formatCurrency(unspent)} unspent so far` : 'Set aside this period',
            colors: [CATEGORY_KIND_META.savings.color],
            guide: `≥ ${GUIDE.savings}%`,
            // An open period can still save what's left; only a closed one has missed the mark.
            off: isClosed && pctOf(byKind.savings + unspent) < GUIDE.savings,
        },
    ]

    return (
        <div>
            {/* One bar of income: each kind's slice, then what's still unspent */}
            <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-line-soft">
                {SEGMENTS.map(k => byKind[k] > 0 && (
                    <div
                        key={k}
                        title={`${CATEGORY_KIND_META[k].label} ${formatCurrency(byKind[k])} · ${pctOf(byKind[k])}%`}
                        className="h-full"
                        style={{ width: `${(byKind[k] / base) * 100}%`, backgroundColor: CATEGORY_KIND_META[k].color }}
                    />
                ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted-ink">
                {SEGMENTS.map(k => (
                    <span key={k} className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_KIND_META[k].color }} />
                        {CATEGORY_KIND_META[k].label}
                    </span>
                ))}
                {unspent > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-line-soft border border-line" /> Unspent
                    </span>
                )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-[14px] border border-line-soft bg-line-soft">
                {rows.map(row => (
                    <div key={row.key} className="bg-surface p-3 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="flex items-center gap-1.5 text-[11.5px] text-muted-ink">
                                <span className="flex -space-x-0.5">
                                    {row.colors.map(c => <span key={c} className="h-2 w-2 rounded-full ring-1 ring-surface" style={{ backgroundColor: c }} />)}
                                </span>
                                {row.label}
                            </p>
                            {hasIncome && (
                                <span className={cn(
                                    'text-[10.5px] font-medium rounded-full px-1.5 py-[1px]',
                                    row.off ? 'bg-warning/10 text-warning' : 'bg-line-soft text-muted-ink'
                                )}>
                                    {row.guide}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 flex items-baseline gap-1.5">
                            <span className={cn('text-[17px] font-medium tabular-nums', row.off ? 'text-warning' : 'text-ink')}>{pctOf(row.amount)}%</span>
                            <span className="text-[12px] text-muted-ink tabular-nums truncate">{formatCurrency(row.amount)}</span>
                        </p>
                        <p className="text-[11px] text-muted-ink mt-0.5 truncate">{row.detail}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
