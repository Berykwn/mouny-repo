import { useMemo, useState } from 'react'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { CATEGORY_KIND_META } from '@/lib/category-kind'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { TransactionWithDetails } from '@/types'
import { kindDailyPace, whatIf } from '../lib/analysis'
import { BlockNote, Em, InsightBlock } from './insight-block'

const STEP = 5_000

interface WhatIfTabProps {
    stats: PeriodStats
    transactions: TransactionWithDetails[]
}

/** Spend a little less per day on everyday or lifestyle things, and see what payday looks like. */
export function WhatIfTab({ stats, transactions }: WhatIfTabProps) {
    const [cuts, setCuts] = useState({ daily: 0, lifestyle: 0 })
    const paces = useMemo(() => ({
        daily: kindDailyPace(stats, transactions, 'daily'),
        lifestyle: kindDailyPace(stats, transactions, 'lifestyle'),
    }), [stats, transactions])
    const result = whatIf(stats, cuts.daily + cuts.lifestyle)

    if (!result) {
        return (
            <InsightBlock kicker="What if" title={stats.isClosed ? 'A closed period can’t change.' : 'A few days of spending first.'}>
                <BlockNote>
                    {stats.isClosed
                        ? 'Pick the open period to try a change to your daily spending.'
                        : 'What if works from your daily pace, which needs at least 3 days and a known period length.'}
                </BlockNote>
            </InsightBlock>
        )
    }

    const rate = (kept: number) => stats.totalIncome > 0 ? `${Math.round((kept / stats.totalIncome) * 100)}%` : '—'
    const changed = cuts.daily + cuts.lifestyle > 0
    const days = stats.daysRemaining ?? 0

    return (
        <div className="lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-4 lg:items-start">
            <InsightBlock
                kicker="What if"
                title={changed
                    ? <>Spending {formatShortCurrency(cuts.daily + cuts.lifestyle)} less a day keeps <Em>{formatShortCurrency(result.after - result.before)} more</Em> by payday.</>
                    : 'Move a slider to see what a smaller daily habit does by payday.'}
                sub={`${days} day${days === 1 ? '' : 's'} left in this period.`}
                how={<>
                    Your pace per kind is its spending so far ÷ days passed, bills and one-offs left out. The cut applies from tomorrow to the end of the period: kept by payday = today’s forecast + cut per day × days left. “A full period” is the cut over {stats.totalDays} days.
                </>}
            >
                <div className="space-y-5">
                    {(['daily', 'lifestyle'] as const).map(kind => {
                        const pace = paces[kind]
                        const max = Math.floor(pace / STEP) * STEP
                        const meta = CATEGORY_KIND_META[kind]
                        const id = `what-if-${kind}`
                        return (
                            <div key={kind}>
                                <div className="flex items-baseline justify-between gap-3">
                                    <label htmlFor={id} className="min-w-0">
                                        <span className="flex items-center gap-2 text-[14px] text-ink">
                                            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                                            {meta.label}
                                        </span>
                                        <span className="block text-[12px] text-muted-ink tabular-nums">
                                            Now {formatCurrency(Math.round(pace))}/day{cuts[kind] > 0 && <> → {formatCurrency(Math.round(pace - cuts[kind]))}</>}
                                        </span>
                                    </label>
                                    <span className="shrink-0 text-[15px] font-semibold text-ink tabular-nums">
                                        {cuts[kind] > 0 ? `−${formatShortCurrency(cuts[kind])}` : '0'}<span className="text-[12px] font-normal text-muted-ink">/day</span>
                                    </span>
                                </div>
                                {max > 0 ? (
                                    <input
                                        id={id}
                                        type="range"
                                        min={0}
                                        max={max}
                                        step={STEP}
                                        value={Math.min(cuts[kind], max)}
                                        onChange={e => setCuts(c => ({ ...c, [kind]: Number(e.target.value) }))}
                                        aria-valuetext={`${formatCurrency(cuts[kind])} less per day`}
                                        className="mt-2 w-full accent-ink"
                                    />
                                ) : (
                                    <p className="mt-1 text-[12px] text-muted-ink">No {meta.label.toLowerCase()} pace to trim yet.</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </InsightBlock>

            <div className="lg:pt-0">
                <div className="rounded-[18px] bg-brand-tint px-5 py-2">
                    <ResultRow label="Kept by payday" before={formatShortCurrency(result.before)} after={formatShortCurrency(result.after)} changed={changed} negative={result.after < 0} />
                    <ResultRow label="Savings rate" before={rate(result.before)} after={rate(result.after)} changed={changed} />
                    <ResultRow label="Over a full period" before="—" after={changed ? `+${formatShortCurrency(result.perPeriod)}` : '—'} changed={changed} />
                </div>
                <button
                    type="button"
                    onClick={() => setCuts({ daily: 0, lifestyle: 0 })}
                    disabled={!changed}
                    className="mt-3 h-11 w-full rounded-[14px] bg-surface-hover text-[13.5px] font-semibold text-ink transition-colors hover:bg-line-soft disabled:opacity-50"
                >
                    Reset
                </button>
            </div>
        </div>
    )
}

function ResultRow({ label, before, after, changed, negative }: { label: string; before: string; after: string; changed: boolean; negative?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 py-3 border-b border-brand-line last:border-b-0">
            <span className="text-[13.5px] text-brand-muted">{label}</span>
            <span className="flex items-baseline gap-2 tabular-nums">
                {changed && before !== '—' && <s className="text-[13px] text-brand-muted">{before}</s>}
                <span className={cn('text-[15px] font-semibold', negative ? 'text-negative' : 'text-ink')}>{changed ? after : before}</span>
            </span>
        </div>
    )
}
