import { useState, type ReactNode } from 'react'
import {
    Area, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Cell,
} from 'recharts'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { dayDate, shortDate } from '@/features/bills/lib/bill-labels'
import { TIME_BANDS, WEEKDAYS, type CategoryVariance, type Heatmap, type PacePoint, type RatePoint } from '../lib/analysis'

/**
 * Insights' charts: one axis each, thin marks, a tooltip on hover, and colours from the
 * theme's variables so dark mode follows.
 */

const TICK = { fontSize: 10.5, fill: 'var(--muted-ink)' }
const AXIS_LINE = { stroke: 'var(--line)' }

function TipBox({ children }: { children: ReactNode }) {
    return <div className="rounded-[12px] border border-line bg-surface px-3 py-2 shadow-lg text-[11.5px]">{children}</div>
}

function TipRow({ label, value, swatch }: { label: string; value: string; swatch?: ReactNode }) {
    return (
        <p className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-ink">{swatch}{label}</span>
            <span className="font-medium text-ink tabular-nums">{value}</span>
        </p>
    )
}

// ─── Spending pace ───────────────────────────────────────────────────────────

function PaceTooltip({ active, payload }: { active?: boolean; payload?: { payload: PacePoint }[] }) {
    if (!active || !payload?.length) return null
    const p = payload[0].payload
    return (
        <TipBox>
            <p className="text-muted-ink mb-1">{dayDate(p.date)} · day {p.day}</p>
            {p.actual !== undefined && <TipRow label="Spent by then" value={formatCurrency(p.actual)} />}
            {p.actual === undefined && p.forecast !== undefined && <TipRow label="Forecast" value={`~${formatCurrency(p.forecast)}`} />}
            {p.band && <TipRow label="Earlier periods" value={`${formatShortCurrency(p.band[0])} – ${formatShortCurrency(p.band[1])}`} />}
        </TipBox>
    )
}

/** Spending through the period: this one so far, the dashed forecast, and the range of earlier ones. */
export function PaceChart({ points, income, todayDay, bandLabel }: {
    points: PacePoint[]
    income: number
    /** Today's day of the period, for the axis; null for a closed period. */
    todayDay: number | null
    bandLabel: string | null
}) {
    const top = Math.max(...points.map(p => Math.max(p.actual ?? 0, p.forecast ?? 0, p.band?.[1] ?? 0)))
    // Income as a line only when it's close enough not to flatten everything else.
    const showIncome = income > 0 && top >= income * 0.6
    const ticks = [points[0].day, ...(todayDay && todayDay > 3 && todayDay < points.length - 3 ? [todayDay] : []), points[points.length - 1].day]
    const end = points[points.length - 1]

    return (
        <div>
            <div role="img" aria-label={`Spending through the period${end.forecast !== undefined ? `, heading for about ${formatShortCurrency(end.forecast)}` : ''}.`} style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                    <ComposedChart data={points} margin={{ top: 14, right: 12, left: 0, bottom: 0 }}>
                        <XAxis
                            dataKey="day"
                            ticks={ticks}
                            tickFormatter={(d: number) => d === todayDay ? 'Today' : shortDate(points[d - 1]?.date ?? points[0].date)}
                            axisLine={AXIS_LINE}
                            tickLine={false}
                            tick={TICK}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={TICK} tickFormatter={(v: number) => formatShortCurrency(v)} width={40} />
                        <Tooltip content={<PaceTooltip />} cursor={{ stroke: 'var(--line-strong)' }} />
                        {bandLabel && (
                            <Area dataKey="band" stroke="none" fill="var(--line)" fillOpacity={0.7} isAnimationActive={false} activeDot={false} />
                        )}
                        {showIncome && (
                            <ReferenceLine
                                y={income}
                                stroke="var(--brand)"
                                strokeDasharray="4 4"
                                label={{ value: `Income ${formatShortCurrency(income)}`, position: 'insideTopRight', fontSize: 10.5, fill: 'var(--brand-ink)' }}
                            />
                        )}
                        <Line dataKey="actual" stroke="var(--ink)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                        <Line dataKey="forecast" stroke="var(--ink)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <div aria-hidden="true" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted-ink">
                <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-3.5 rounded-full bg-ink" /> This period</span>
                {points.some(p => p.forecast !== undefined) && (
                    <span className="inline-flex items-center gap-1.5"><span className="w-3.5 border-t-2 border-dashed border-ink" /> Forecast</span>
                )}
                {bandLabel && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded-[3px] bg-line" /> {bandLabel}</span>}
                {showIncome && <span className="inline-flex items-center gap-1.5"><span className="w-3.5 border-t-2 border-dashed border-brand" /> Income</span>}
            </div>
        </div>
    )
}

// ─── Unusual for you ─────────────────────────────────────────────────────────

/**
 * Each category's change from its usual, as bars either side of a "your usual" line. The
 * figure sits in its own column at the right edge, so a long bar never pushes it past the
 * chart or over a name.
 */
export function VarianceChart({ rows }: { rows: CategoryVariance[] }) {
    const max = Math.max(...rows.map(r => Math.abs(r.pct)), 1)
    return (
        <div>
            <div className="space-y-2">
                {rows.map(r => {
                    const width = `${(Math.abs(r.pct) / max) * 50}%`
                    const up = r.pct > 0
                    return (
                        <div
                            key={r.id}
                            className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_3.25rem] items-center gap-3"
                            title={`${r.name}: ${formatCurrency(Math.round(r.current))} on pace, usual ${formatCurrency(Math.round(r.usual))}`}
                        >
                            <span className="truncate text-[13px] text-ink">{r.name}</span>
                            <span className="relative h-6 overflow-hidden">
                                <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
                                <span
                                    className={cn('absolute top-1 bottom-1 rounded-[4px]', up ? 'bg-warning' : 'bg-info')}
                                    style={up ? { left: '50%', width } : { right: '50%', width }}
                                />
                            </span>
                            <span className="text-right text-[11.5px] font-semibold text-ink tabular-nums whitespace-nowrap">
                                {up ? '+' : '−'}{Math.abs(r.pct)}%
                            </span>
                        </div>
                    )
                })}
            </div>
            <div aria-hidden="true" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted-ink">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-info" /> Less than usual</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-warning" /> More than usual</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-px bg-line-strong" /> Your usual</span>
            </div>
        </div>
    )
}

// ─── When you spend ──────────────────────────────────────────────────────────

/** Weekday by time of day, one hue from light to dark; hover or tap a cell for its amount. */
export function HeatmapChart({ map }: { map: Heatmap }) {
    const [hover, setHover] = useState<{ w: number; b: number } | null>(null)
    const max = Math.max(...map.cells.flat(), 1)
    const shade = (v: number) => v <= 0 ? 'var(--line-soft)' : `color-mix(in srgb, var(--brand) ${Math.round(12 + (v / max) * 88)}%, var(--line-soft))`
    const hovered = hover ? map.cells[hover.w][hover.b] : null

    return (
        <div>
            <p aria-live="polite" className="mb-2 h-4 text-[12px] text-muted-ink tabular-nums">
                {hover && hovered !== null
                    ? <>{WEEKDAYS[hover.w]} {TIME_BANDS[hover.b].toLowerCase()} · <span className="font-medium text-ink">{formatCurrency(Math.round(hovered))}</span> a week</>
                    : 'Hover or tap a cell'}
            </p>
            <div role="table" aria-label="Average spending per week by weekday and time of day" className="grid grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] gap-1.5">
                <span role="presentation" />
                {TIME_BANDS.map(b => (
                    <span key={b} role="columnheader" className="truncate text-center text-[10.5px] text-muted-ink">{b}</span>
                ))}
                {WEEKDAYS.map((day, w) => (
                    <div key={day} role="row" className="contents">
                        <span role="rowheader" className="self-center text-[12px] text-muted-ink">{day}</span>
                        {TIME_BANDS.map((band, b) => (
                            <button
                                key={band}
                                type="button"
                                role="cell"
                                aria-label={`${day} ${band}: ${formatCurrency(Math.round(map.cells[w][b]))} a week`}
                                onMouseEnter={() => setHover({ w, b })}
                                onMouseLeave={() => setHover(null)}
                                onFocus={() => setHover({ w, b })}
                                onBlur={() => setHover(null)}
                                onClick={() => setHover({ w, b })}
                                className={cn('h-8 rounded-[7px] transition-shadow', hover?.w === w && hover?.b === b && 'ring-2 ring-ink')}
                                style={{ background: shade(map.cells[w][b]) }}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div aria-hidden="true" className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-ink">
                Less
                {[0.1, 0.3, 0.55, 0.8, 1].map(f => <span key={f} className="h-3 w-3 rounded-[3px]" style={{ background: shade(f * max) }} />)}
                More · a week
            </div>
        </div>
    )
}

// ─── Weekdays ────────────────────────────────────────────────────────────────

/** Spending per weekday, the busiest day in full colour and the rest lighter. */
export function WeekdayChart({ days }: { days: { day: string; total: number }[] }) {
    const top = Math.max(...days.map(d => d.total))
    return (
        <div role="img" aria-label={days.map(d => `${d.day} ${formatShortCurrency(d.total)}`).join(', ')} style={{ width: '100%', height: 170 }}>
            <ResponsiveContainer>
                <BarChart data={days} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="day" axisLine={AXIS_LINE} tickLine={false} tick={TICK} />
                    <YAxis axisLine={false} tickLine={false} tick={TICK} tickFormatter={(v: number) => formatShortCurrency(v)} width={40} />
                    <Tooltip
                        cursor={{ fill: 'var(--surface-hover)' }}
                        content={({ active, payload }) => active && payload?.length
                            ? <TipBox><TipRow label={String(payload[0].payload.day)} value={formatCurrency(Number(payload[0].value))} /></TipBox>
                            : null}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                        {days.map(d => (
                            <Cell key={d.day} fill="var(--brand)" fillOpacity={d.total === top ? 1 : 0.35} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// ─── Savings rate ────────────────────────────────────────────────────────────

/** Share of income kept per period, against the 20% guide; the open period is a hollow forecast. */
export function RateChart({ points, guide }: { points: RatePoint[]; guide: number }) {
    const data = points.map(p => ({ ...p, pct: p.rate === null ? null : Math.round(p.rate * 100) }))
    const pcts = data.map(d => d.pct).filter((v): v is number => v !== null)
    const lo = Math.min(0, ...pcts)
    const hi = Math.max(guide * 100 + 10, ...pcts)
    return (
        <div role="img" aria-label={data.map(d => `${d.label} ${d.pct ?? '—'}%${d.projected ? ' (forecast)' : ''}`).join(', ')} style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 14, right: 14, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" axisLine={AXIS_LINE} tickLine={false} tick={TICK} />
                    <YAxis domain={[Math.floor(lo / 10) * 10, Math.ceil(hi / 10) * 10]} axisLine={false} tickLine={false} tick={TICK} tickFormatter={(v: number) => `${v}%`} width={40} />
                    <Tooltip
                        cursor={{ stroke: 'var(--line-strong)' }}
                        content={({ active, payload }) => active && payload?.length
                            ? <TipBox><TipRow label={`${payload[0].payload.label}${payload[0].payload.projected ? ' · forecast' : ''}`} value={`${payload[0].payload.pct ?? '—'}%`} /></TipBox>
                            : null}
                    />
                    <ReferenceLine
                        y={guide * 100}
                        stroke="var(--brand)"
                        strokeDasharray="4 4"
                        label={{ value: `${guide * 100}% guide`, position: 'insideTopLeft', fontSize: 10.5, fill: 'var(--brand-ink)' }}
                    />
                    <Line
                        dataKey="pct"
                        stroke="var(--ink)"
                        strokeWidth={2}
                        connectNulls
                        isAnimationActive={false}
                        dot={(props: { cx?: number; cy?: number; index?: number }) => {
                            const p = props.index !== undefined ? data[props.index] : undefined
                            if (!p || p.pct === null || props.cx === undefined || props.cy === undefined) return <g key={props.index} />
                            return p.projected
                                ? <circle key={props.index} cx={props.cx} cy={props.cy} r={5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
                                : <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

// ─── Balances at each close ──────────────────────────────────────────────────

/** What the accounts held at each period's close, and today for the open one. */
export function BalanceTrendChart({ points }: { points: { label: string; balance: number; now: boolean }[] }) {
    return (
        <div role="img" aria-label={points.map(p => `${p.label} ${formatShortCurrency(p.balance)}`).join(', ')} style={{ width: '100%', height: 190 }}>
            <ResponsiveContainer>
                <ComposedChart data={points} margin={{ top: 14, right: 14, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" axisLine={AXIS_LINE} tickLine={false} tick={TICK} />
                    <YAxis axisLine={false} tickLine={false} tick={TICK} tickFormatter={(v: number) => formatShortCurrency(v)} width={40} domain={['auto', 'auto']} />
                    <Tooltip
                        cursor={{ stroke: 'var(--line-strong)' }}
                        content={({ active, payload }) => active && payload?.length
                            ? <TipBox><TipRow label={`${payload[0].payload.label}${payload[0].payload.now ? ' · today' : ' · at close'}`} value={formatCurrency(Number(payload[0].payload.balance))} /></TipBox>
                            : null}
                    />
                    <Area dataKey="balance" stroke="var(--brand)" strokeWidth={2} fill="var(--brand)" fillOpacity={0.1} isAnimationActive={false} dot={{ r: 3.5, fill: 'var(--brand)', stroke: 'var(--surface)', strokeWidth: 2 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    )
}
