import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import type { TrendPoint } from '../../hooks/use-period-trend'

interface PeriodTrendChartProps {
  trend: TrendPoint[]
  loading?: boolean
  /** The other periods couldn't be loaded. */
  failed?: boolean
  onRetry?: () => void
}

const INCOME_COLOR = 'var(--brand-ink)'
const OUT_COLOR = 'var(--chart-out)'
const NET_COLOR = 'var(--ink)'
const TICK = { fontSize: 10.5, fill: 'var(--subtle-ink)' }

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${formatShortCurrency(Math.abs(n))}`

function TrendTooltip({ active, payload, label }: {
  active?: boolean
  label?: string
  payload?: { payload: TrendPoint }[]
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload

  return (
    <div className="rounded-[12px] border border-line bg-surface px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-medium text-ink mb-1.5">
        {label}{p.isCurrent && <span className="text-muted-ink"> · ongoing</span>}
      </p>
      <div className="space-y-0.5">
        <p className="text-[11px] flex items-center justify-between gap-4">
          <span style={{ color: INCOME_COLOR }}>In</span>
          <span className="font-medium text-ink">{formatCurrency(p.income)}</span>
        </p>
        <p className="text-[11px] flex items-center justify-between gap-4">
          <span style={{ color: OUT_COLOR }}>Spent</span>
          <span className="font-medium text-ink">{formatCurrency(p.expense - p.savings)}</span>
        </p>
        {p.savings !== 0 && (
          <p className="text-[11px] flex items-center justify-between gap-4">
            <span style={{ color: OUT_COLOR }}>Saved</span>
            <span className="font-medium text-ink">{formatCurrency(p.savings)}</span>
          </p>
        )}
        <p className="text-[11px] flex items-center justify-between gap-4 pt-0.5 border-t border-line-soft mt-1">
          <span className="text-muted-ink">Net</span>
          <span className={p.net < 0 ? 'font-medium text-negative' : 'font-medium text-brand-ink'}>
            {p.net >= 0 ? '+' : ''}{formatCurrency(p.net)}
          </span>
        </p>
      </div>
    </div>
  )
}

export function PeriodTrendChart({ trend, loading = false, failed = false, onRetry }: PeriodTrendChartProps) {
  if (loading) return <Skeleton className="mt-3 h-[180px] w-full rounded-[14px]" />

  if (failed) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-2 text-center py-10 px-4">
        <p className="text-[13px] text-muted-ink">Couldn't load your other periods.</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="text-[12.5px] font-medium text-brand-ink underline underline-offset-2">
            Retry
          </button>
        )}
      </div>
    )
  }

  if (trend.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 px-4">
        <p className="text-[13px] text-muted-ink">
          Your trend will appear once you've completed a full pay period.
        </p>
      </div>
    )
  }

  const hasSavings = trend.some(t => t.savings !== 0)
  const nets = trend.map(t => t.net)
  const summary = `Last ${trend.length} pay periods, ${trend[0].label} to ${trend[trend.length - 1].label}. `
    + `Net from ${signed(Math.min(...nets))} to ${signed(Math.max(...nets))}; `
    + `latest ${signed(nets[nets.length - 1])}${trend[trend.length - 1].isCurrent ? ' so far' : ''}.`

  return (
    <div>
      {/* The chart is drawn for the eye; the label carries the gist for a screen reader. */}
      <div role="img" aria-label={summary} style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ ...TICK, fontSize: 10 }}
              tickFormatter={(v: number) => formatShortCurrency(v)}
              width={36}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
            <Bar dataKey="income" name="In" radius={[3, 3, 0, 0]} barSize={10}>
              {trend.map((d, i) => (
                <Cell key={i} fill={INCOME_COLOR} fillOpacity={d.isCurrent ? 0.55 : 1} />
              ))}
            </Bar>
            <Bar dataKey="expense" name="Out" radius={[3, 3, 0, 0]} barSize={10}>
              {trend.map((d, i) => (
                <Cell key={i} fill={OUT_COLOR} fillOpacity={d.isCurrent ? 0.55 : 1} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="net"
              stroke={NET_COLOR}
              strokeWidth={2}
              dot={{ r: 3, fill: NET_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div aria-hidden="true" className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 px-1">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-ink">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: INCOME_COLOR }} /> Income
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-ink">
          {/* Same as the projection's bar: the bar is everything that went out. */}
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: OUT_COLOR }} /> {hasSavings ? 'Spent + saved' : 'Spent'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-ink">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NET_COLOR }} /> Net
        </span>
        <span className="text-[10.5px] text-subtle-ink ml-auto">lighter bar = ongoing</span>
      </div>
    </div>
  )
}
