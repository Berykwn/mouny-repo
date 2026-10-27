import { useMemo } from 'react'
import { formatCurrency, toISODate } from '@/lib/helpers'
import { groupExpensesByWeekday } from '../lib/group-expenses-by-weekday'
import type { TransactionWithDetails } from '@/types'
import { frequentNotes, HEATMAP_WEEKS, isVariable, spendingHeatmap, type PastPeriod, type TimeBand } from '../lib/analysis'
import { BlockNote, Em, InsightBlock } from './insight-block'
import { HeatmapChart, WeekdayChart } from './charts'

const BAND_PLURAL: Record<TimeBand, string> = {
    Morning: 'mornings',
    Lunch: 'lunchtimes',
    Afternoon: 'afternoons',
    Evening: 'evenings',
    Late: 'late nights',
}

const WEEKDAY_NAMES: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }

const pct = (share: number) => `${Math.round(share * 100)}%`

interface HabitsTabProps {
    transactions: TransactionWithDetails[]
    /** Null while the earlier periods load. */
    history: PastPeriod[] | null
    /** The selected period's last day; null while it's open. */
    periodEnd: string | null
}

/** When and on what the everyday money goes. */
export function HabitsTab({ transactions, history, periodEnd }: HabitsTabProps) {
    // The weeks up to the period's end: an old period looks at its own weeks, not at today's.
    const realToday = toISODate()
    const today = periodEnd && periodEnd < realToday ? periodEnd : realToday
    const all = useMemo(() => [...transactions, ...(history ?? []).flatMap(p => p.transactions)], [transactions, history])
    const map = useMemo(() => spendingHeatmap(all, today), [all, today])
    const weekdays = useMemo(() => groupExpensesByWeekday(transactions.filter(isVariable)), [transactions])
    const weekdayTotal = weekdays.reduce((s, d) => s + d.total, 0)
    const topDay = weekdays.reduce((mx, d) => (d.total > mx.total ? d : mx), weekdays[0])
    const { notes, variableTotal } = useMemo(() => frequentNotes(transactions), [transactions])
    const notesTotal = notes.reduce((s, n) => s + n.total, 0)

    return (
        <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
            <InsightBlock
                kicker="When you spend"
                title={map.top
                    ? <>{map.top.weekday} {BAND_PLURAL[map.top.band]} are <Em>{pct(map.top.share)} of your everyday and lifestyle spending</Em>.</>
                    : 'Log a few entries on the day you spend to see when it happens.'}
                sub={`Average everyday and lifestyle spending per week, by weekday and the time of the entry, over the last ${map.weeks} week${map.weeks === 1 ? '' : 's'}.`}
                how={<>
                    From the time each entry was made, over the last {HEATMAP_WEEKS} weeks at most. Morning 06–11, Lunch 11–14, Afternoon 14–18, Evening 18–22, Late 22–06.
                    {map.untimed > 0 && <> {map.untimed} entr{map.untimed === 1 ? 'y was' : 'ies were'} logged on a later day, so {map.untimed === 1 ? 'its' : 'their'} time isn’t known and {map.untimed === 1 ? 'it’s' : 'they’re'} left out.</>}
                    {history === null && ' Earlier periods are still loading.'}
                </>}
            >
                {map.total > 0 && <HeatmapChart map={map} />}
            </InsightBlock>

            <InsightBlock
                kicker="By weekday"
                title={weekdayTotal > 0
                    ? <>{WEEKDAY_NAMES[topDay.day]}s take <Em>{pct(topDay.total / weekdayTotal)}</Em> of this period’s everyday and lifestyle spending.</>
                    : 'No everyday or lifestyle spending yet this period.'}
                how="Everyday and lifestyle spending this period, summed by the weekday of each transaction’s date. Bills and savings are left out."
            >
                {weekdayTotal > 0 && <WeekdayChart days={weekdays} />}
            </InsightBlock>

            <InsightBlock
                kicker="Small but frequent"
                title={notes.length > 0 && variableTotal > 0
                    ? <>{listNames(notes.slice(0, 3).map(n => n.note))} {notes.length === 1 ? 'adds' : 'add'} up to <Em>{formatCurrency(notesTotal)}</Em>, {pct(notesTotal / variableTotal)} of everyday and lifestyle spending.</>
                    : 'No note repeats three times yet this period.'}
                sub={notes.length > 0 ? 'Grouped by your notes: the same note text counts as the same thing.' : undefined}
                how="Everyday and lifestyle entries this period grouped by their exact note, ignoring case and spaces around it. A note needs at least 3 entries to show."
                className="lg:col-span-2"
            >
                {notes.length > 0 ? (
                    <div>
                        {notes.map(n => (
                            <div key={n.note} className="py-2.5 border-b border-line-soft last:border-b-0" title={`${n.count} entries, ${formatCurrency(n.total / n.count)} on average`}>
                                <div className="flex items-baseline justify-between gap-3">
                                    <p className="truncate text-[14px] text-ink">{n.note}</p>
                                    <p className="shrink-0 text-[13.5px] font-medium text-ink tabular-nums">{formatCurrency(n.total)}</p>
                                </div>
                                <div className="mt-1.5 flex items-center gap-3">
                                    <span aria-hidden="true" className="h-1 flex-1 rounded-full bg-line-soft overflow-hidden">
                                        <span className="block h-full rounded-full bg-brand" style={{ width: `${(n.total / notes[0].total) * 100}%` }} />
                                    </span>
                                    <span className="shrink-0 text-[12px] text-muted-ink tabular-nums">{n.count}× · avg {formatCurrency(Math.round(n.total / n.count))}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <BlockNote>Notes like “Kopi” or “Grab ke kantor” that come back often will show here.</BlockNote>}
            </InsightBlock>
        </div>
    )
}

function listNames(names: string[]): string {
    if (names.length <= 1) return names[0] ?? ''
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
