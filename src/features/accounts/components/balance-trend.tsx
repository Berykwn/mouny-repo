import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { TrendPoint } from '../lib/account-insights'

const W = 300
const H = 64
const PAD = 6

/** Total balance at each period close, ending at today — is the money growing? */
export function BalanceTrend({ points }: { points: TrendPoint[] }) {
    // One close plus "now" is the minimum for a line to say anything.
    if (points.length < 2) return null

    const values = points.map(p => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
    const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2)
    const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')
    const area = `${x(0)},${H} ${line} ${x(points.length - 1)},${H}`

    const lastClose = points[points.length - 2].value
    const now = points[points.length - 1].value
    const diff = now - lastClose
    const up = diff >= 0

    return (
        <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Balance over periods</p>
                    <p className="text-[11.5px] text-muted-ink mt-1">Total at each close, then today</p>
                </div>
                <div className="text-right shrink-0">
                    <p className={cn('text-[13px] font-medium tabular-nums', up ? 'text-positive' : 'text-negative')}>
                        {up ? '+' : '−'}{formatCurrency(Math.abs(diff))}
                    </p>
                    <p className="text-[10.5px] text-subtle-ink">vs last close</p>
                </div>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full h-16" preserveAspectRatio="none" aria-hidden>
                <defs>
                    <linearGradient id="balance-trend-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6FA82B" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#6FA82B" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polygon points={area} fill="url(#balance-trend-fill)" />
                <polyline points={line} fill="none" stroke="#6FA82B" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>

            <div className="mt-1.5 flex justify-between text-[10px] text-subtle-ink">
                {points.map((p, i) => (
                    <span key={i} className={cn(i === points.length - 1 && 'text-ink font-medium')} title={formatCurrency(p.value)}>
                        {p.label}
                    </span>
                ))}
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-muted-ink tabular-nums">
                <span>{formatShortCurrency(points[0].value)}</span>
                <span>{formatShortCurrency(now)}</span>
            </div>
        </div>
    )
}
