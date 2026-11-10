import { formatShortCurrency } from '@/lib/helpers'
import type { PayPeriod } from '@/types'
import { cn } from '@/lib/utils'
import { unspentPct, type PeriodSummary } from '@/lib/period-summary'
import { periodName, periodShortName } from '@/lib/period-name'
import { periodRange } from '../lib/period-progress'

/** A kept share this high reads as a good period: the 20% of the 50/30/20 guide. */
const GOOD_KEPT_PCT = 20

interface PeriodHistoryProps {
    /** Closed periods, newest first. */
    periods: PayPeriod[]
    summaries: Record<string, PeriodSummary>
    onOpen: (period: PayPeriod) => void
}

/** Past periods, one line each (a table on desktop): what came in, went out, and was kept. */
export function PeriodHistory({ periods, summaries, onOpen }: PeriodHistoryProps) {
    if (periods.length === 0) return null

    return (
        <div>
            {/* Phone: one row per period */}
            <ul className="lg:hidden">
                {periods.map(p => {
                    const s = summaries[p.id]
                    const pct = s ? unspentPct(s.unspent, s.income) : null
                    return (
                        <li key={p.id} className="border-b border-line-soft last:border-0">
                            <button type="button" onClick={() => onOpen(p)} className="w-full flex items-center gap-3 py-3 text-left">
                                <span className="w-11 h-11 rounded-[12px] bg-line-soft flex items-center justify-center shrink-0 text-[12.5px] font-bold text-ink/70">
                                    {/* The month alone; the name beside it carries the year when it isn't this one. */}
                                    {periodShortName(p).split(' ')[0]}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[15.5px] font-medium text-ink truncate">{periodName(p)}</span>
                                    <span className="block text-[13px] text-subtle-ink truncate">
                                        {periodRange(p.start_date, p.end_date)}{s && ` · spent ${formatShortCurrency(s.spending)}`}
                                    </span>
                                </span>
                                <span className="text-right shrink-0">
                                    <span className={cn('block text-[15.5px] font-medium tabular-nums', pct !== null && pct >= GOOD_KEPT_PCT ? 'text-brand-ink' : 'text-ink')}>
                                        {pct !== null ? `${pct}% kept` : '—'}
                                    </span>
                                    {s && <span className="block text-[12px] text-subtle-ink tabular-nums">{formatShortCurrency(s.unspent)}</span>}
                                </span>
                            </button>
                        </li>
                    )
                })}
            </ul>

            {/* Desktop: the same as a table */}
            <table className="hidden lg:table w-full text-[14.5px]">
                <thead>
                    <tr className="text-[12px] font-semibold uppercase tracking-[.06em] text-subtle-ink">
                        <th className="text-left font-semibold py-2">Period</th>
                        <th className="text-right font-semibold py-2">Income</th>
                        <th className="text-right font-semibold py-2">Spent</th>
                        <th className="text-right font-semibold py-2">Saved</th>
                        {/* Not "Left": that's Home's spendable figure for the running period. */}
                        <th className="text-right font-semibold py-2">Net</th>
                        <th className="text-right font-semibold py-2">Kept</th>
                    </tr>
                </thead>
                <tbody>
                    {periods.map(p => {
                        const s = summaries[p.id]
                        const pct = s ? unspentPct(s.unspent, s.income) : null
                        const n = (v: number | undefined) => v === undefined ? '—' : v.toLocaleString('id-ID')
                        return (
                            <tr
                                key={p.id}
                                onClick={() => onOpen(p)}
                                className="border-t border-line-soft cursor-pointer hover:bg-surface-soft transition-colors tabular-nums"
                            >
                                <td className="py-3.5">
                                    <button type="button" onClick={e => { e.stopPropagation(); onOpen(p) }} className="text-left">
                                        <span className="text-ink">{periodName(p)}</span>
                                        <span className="ml-2.5 text-[13px] text-subtle-ink">{periodRange(p.start_date, p.end_date)}</span>
                                    </button>
                                </td>
                                <td className="py-3.5 text-right font-semibold text-ink">{n(s?.income)}</td>
                                <td className="py-3.5 text-right font-semibold text-ink">{n(s?.spending)}</td>
                                <td className="py-3.5 text-right font-semibold text-ink">{n(s?.savings)}</td>
                                <td className={cn('py-3.5 text-right font-semibold', s && s.net < 0 ? 'text-negative' : 'text-ink')}>{n(s?.net)}</td>
                                <td className={cn('py-3.5 text-right font-semibold', pct !== null && pct >= GOOD_KEPT_PCT ? 'text-brand-ink' : 'text-ink')}>
                                    {pct !== null ? `${pct}%` : '—'}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
