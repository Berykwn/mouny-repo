import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import type { CategoryTotal } from '../../lib/group-expenses-by-category'
import { categoryChartColor } from '@/features/categories/lib/category-colors'

const FALLBACK_COLOR = '#94a3b8'

function DonutTooltip({ active, payload, total }: {
    active?: boolean
    payload?: { payload: CategoryTotal }[]
    total: number
}) {
    if (!active || !payload?.length) return null
    const cat = payload[0].payload
    const pct = total > 0 ? Math.round((cat.amount / total) * 100) : 0
    return (
        <div className="rounded-[10px] border border-[#e5e5e5] bg-white px-2.5 py-1.5 shadow-lg">
            <p className="text-[10.5px] text-[#8a8a84]">{cat.name}</p>
            <p className="text-[12px] font-medium text-[#252525]">{formatCurrency(cat.amount)} · {pct}%</p>
        </div>
    )
}

export function CategoryDonutChart({ categories, total }: { categories: CategoryTotal[]; total: number }) {
    if (categories.length === 0) return null

    return (
        <div className="relative mb-3" style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={categories}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="90%"
                        paddingAngle={2}
                        strokeWidth={0}
                        isAnimationActive={false}
                    >
                        {categories.map(cat => (
                            <Cell key={cat.id} fill={categoryChartColor(cat, FALLBACK_COLOR)} />
                        ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip total={total} />} />
                </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase tracking-[.1em] text-[#a3a3a3]">Total</p>
                <p className="text-[15px] font-medium text-[#252525]">{formatShortCurrency(total)}</p>
            </div>
        </div>
    )
}
