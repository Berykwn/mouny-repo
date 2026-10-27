import { Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { dayDate, shortDate } from '@/features/bills/lib/bill-labels'
import type { CashOutlook, OutlookPoint } from '../lib/cash-outlook'

const TICK = { fontSize: 10.5, fill: 'var(--muted-ink)' }
const EVENT_COLOR: Record<string, string> = {
    in: 'var(--brand)',
    bill: 'var(--tint-violet)',
    debt: 'var(--tint-violet)',
}

function OutlookTooltip({ active, payload }: { active?: boolean; payload?: { payload: OutlookPoint }[] }) {
    if (!active || !payload?.length) return null
    const p = payload[0].payload
    return (
        <div className="rounded-[12px] border border-line bg-surface px-3 py-2 shadow-lg max-w-[220px]">
            <p className="text-[11px] text-muted-ink">{dayDate(p.date)}</p>
            <p className="text-[12.5px] font-medium text-ink tabular-nums">{formatCurrency(p.balance)}</p>
            {p.events.map((e, i) => (
                <p key={i} className="mt-0.5 flex justify-between gap-3 text-[11px] text-muted-ink">
                    <span className="truncate">{e.label}</span>
                    <span className="tabular-nums text-ink">{e.amount > 0 ? '+' : '−'}{formatShortCurrency(Math.abs(e.amount))}</span>
                </p>
            ))}
        </div>
    )
}

/**
 * The everyday balance day by day: a step down at each bill, up at each payday, and the
 * pace's slow slope between. One axis; event days get a dot, the lowest point a ring.
 */
export function CashOutlookChart({ outlook, height = 200 }: { outlook: CashOutlook; height?: number }) {
    const { points, lowest } = outlook
    const ticks = [points[0].date, points[Math.floor(points.length / 2)].date, points[points.length - 1].date]
    const summary = `Everyday balance over the next ${points.length - 1} days, from ${formatShortCurrency(points[0].balance)} `
        + `to ${formatShortCurrency(points[points.length - 1].balance)}. Lowest ${formatShortCurrency(lowest.balance)} on ${shortDate(lowest.date)}.`

    return (
        <div>
            <div role="img" aria-label={summary} style={{ width: '100%', height }}>
                <ResponsiveContainer>
                    <LineChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" ticks={ticks} tickFormatter={shortDate} axisLine={{ stroke: 'var(--line)' }} tickLine={false} tick={TICK} />
                        <YAxis axisLine={false} tickLine={false} tick={TICK} tickFormatter={(v: number) => formatShortCurrency(v)} width={40} />
                        <Tooltip content={<OutlookTooltip />} cursor={{ stroke: 'var(--line-strong)' }} />
                        <Line
                            type="stepAfter"
                            dataKey="balance"
                            stroke="var(--ink)"
                            strokeWidth={2}
                            isAnimationActive={false}
                            dot={(props: { cx?: number; cy?: number; index?: number }) => {
                                const p = props.index !== undefined ? points[props.index] : undefined
                                if (!p || p.events.length === 0 || props.cx === undefined || props.cy === undefined) return <g key={props.index} />
                                const kind = p.events.some(e => e.kind === 'in') ? 'in' : 'bill'
                                return <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill={EVENT_COLOR[kind]} stroke="var(--surface)" strokeWidth={2} />
                            }}
                            activeDot={{ r: 4, fill: 'var(--ink)', stroke: 'var(--surface)', strokeWidth: 2 }}
                        />
                        <ReferenceDot x={lowest.date} y={lowest.balance} r={7} fill="none" stroke="var(--negative)" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div aria-hidden="true" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted-ink">
                <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-3 rounded-full bg-ink" /> Everyday balance</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: EVENT_COLOR.in }} /> Money in</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: EVENT_COLOR.bill }} /> Bills &amp; debts</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-negative" /> Lowest</span>
            </div>
        </div>
    )
}
