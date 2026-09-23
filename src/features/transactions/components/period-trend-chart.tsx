import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import type { TrendPoint } from '../hooks/use-period-trend'

interface PeriodTrendChartProps {
  trend: TrendPoint[]
}

const INCOME_COLOR = '#4d7a1d'
const EXPENSE_COLOR = '#c9977a'
const NET_COLOR = '#252525'

function TrendTooltip({ active, payload, label }: {
  active?: boolean
  label?: string
  payload?: { payload: TrendPoint }[]
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload

  return (
    <div className="rounded-[12px] border border-[#e5e5e5] bg-white px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-medium text-[#252525] mb-1.5">
        {label}{p.isCurrent && <span className="text-[#8a8a84]"> · ongoing</span>}
      </p>
      <div className="space-y-0.5">
        <p className="text-[11px] flex items-center justify-between gap-4">
          <span style={{ color: INCOME_COLOR }}>In</span>
          <span className="font-medium text-[#252525]">{formatCurrency(p.income)}</span>
        </p>
        <p className="text-[11px] flex items-center justify-between gap-4">
          <span style={{ color: EXPENSE_COLOR }}>Out</span>
          <span className="font-medium text-[#252525]">{formatCurrency(p.expense)}</span>
        </p>
        <p className="text-[11px] flex items-center justify-between gap-4 pt-0.5 border-t border-[#f2f2f0] mt-1">
          <span className="text-[#8a8a84]">Net</span>
          <span className={p.net < 0 ? 'font-medium text-[#dc2626]' : 'font-medium text-[#4d7a1d]'}>
            {p.net >= 0 ? '+' : ''}{formatCurrency(p.net)}
          </span>
        </p>
      </div>
    </div>
  )
}

export function PeriodTrendChart({ trend }: PeriodTrendChartProps) {
  if (trend.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 px-4">
        <p className="text-[13px] text-[#8a8a84]">
          Your trend will appear once you've completed a full pay period.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10.5, fill: '#a3a3a3' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#a3a3a3' }}
              tickFormatter={(v: number) => formatShortCurrency(v)}
              width={36}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ fill: '#f4f4f2' }} />
            <Bar dataKey="income" name="In" radius={[3, 3, 0, 0]} barSize={10}>
              {trend.map((d, i) => (
                <Cell key={i} fill={INCOME_COLOR} fillOpacity={d.isCurrent ? 0.55 : 1} />
              ))}
            </Bar>
            <Bar dataKey="expense" name="Out" radius={[3, 3, 0, 0]} barSize={10}>
              {trend.map((d, i) => (
                <Cell key={i} fill={EXPENSE_COLOR} fillOpacity={d.isCurrent ? 0.55 : 1} />
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

      <div className="flex items-center gap-4 mt-2 px-1">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[#8a8a84]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: INCOME_COLOR }} /> Income
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[#8a8a84]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: EXPENSE_COLOR }} /> Expense
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[#8a8a84]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NET_COLOR }} /> Net
        </span>
        <span className="text-[10.5px] text-[#a3a3a3] ml-auto">lighter bar = ongoing</span>
      </div>
    </div>
  )
}
