import { formatShortCurrency } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import { TrendPoint } from "@/types/overview.types"

export default function HealthAndTrendSection({
    score,
    label,
    reasons,
    trendPeriods,
}: {
    score: number
    label: string
    reasons: string[]
    trendPeriods: TrendPoint[]
}) {
    const scoreColor =
        score >= 80 ? 'text-[#059669]' :
            score >= 60 ? 'text-amber-500' :
                score >= 40 ? 'text-orange-500' : 'text-[#dc2626]'

    const barColor =
        score >= 80 ? 'bg-[#059669]' :
            score >= 60 ? 'bg-amber-500' :
                score >= 40 ? 'bg-orange-500' : 'bg-[#dc2626]'

    const hasTrend = trendPeriods.length >= 2

    return (
        <div className="rounded-[20px] border border-[#e5e5e5] bg-white px-4 py-3.5 space-y-3">
            {/* Spending Trend Table */}
            <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Spending Trend</p>

                {!hasTrend ? (
                    <p className="text-[12px] text-[#8a8a84]">
                        Not enough data. Trend will appear after the first period closes.
                    </p>
                ) : (
                    <div>
                        <div className="grid grid-cols-4 pb-1.5 border-b border-[#f2f2f0]">
                            <p className="text-[10px] text-[#8a8a84]">Period</p>
                            <p className="text-[10px] text-[#8a8a84] text-right">Income</p>
                            <p className="text-[10px] text-[#8a8a84] text-right">Expense</p>
                            <p className="text-[10px] text-[#8a8a84] text-right">vs prev</p>
                        </div>

                        {trendPeriods.map((p, i) => {
                            const isActive = i === trendPeriods.length - 1
                            const prevExpense = i > 0 ? trendPeriods[i - 1].expense : null
                            const diffPct = prevExpense && prevExpense > 0
                                ? Math.round(((p.expense - prevExpense) / prevExpense) * 100)
                                : null

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        'grid grid-cols-4 py-2',
                                        i < trendPeriods.length - 1 && 'border-b border-dashed border-[#f2f2f0]'
                                    )}
                                >
                                    <div className="flex items-center gap-1">
                                        {isActive && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#252525] inline-block" />
                                        )}
                                        <p className={cn(
                                            'text-[11px]',
                                            isActive ? 'text-[#252525] font-medium' : 'text-[#8a8a84]'
                                        )}>
                                            {p.label}
                                        </p>
                                    </div>
                                    <p className={cn(
                                        'text-[11px] text-right',
                                        isActive ? 'text-[#059669] font-medium' : 'text-[#8a8a84]'
                                    )}>
                                        {formatShortCurrency(p.income)}
                                    </p>
                                    <p className={cn(
                                        'text-[11px] text-right',
                                        isActive ? 'text-[#252525] font-medium' : 'text-[#8a8a84]'
                                    )}>
                                        {formatShortCurrency(p.expense)}
                                    </p>
                                    <p className={cn(
                                        'text-[11px] text-right',
                                        diffPct === null ? 'text-[#8a8a84]' :
                                            diffPct <= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                                    )}>
                                        {diffPct === null ? '—' : diffPct === 0 ? '0%' : `${diffPct > 0 ? '↑' : '↓'}${Math.abs(diffPct)}%`}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="border-t border-[#f2f2f0]" />

            {/* Health Score */}
            <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Financial Health</p>
                <div className="flex items-end justify-between">
                    <p className={cn('text-[22px] lg:text-[18px] leading-none font-medium', scoreColor)}>{label}</p>
                    <p className={cn('text-[32px] lg:text-[26px] leading-none font-medium', scoreColor)}>{score}</p>
                </div>
                <div className="h-1 bg-[#f2f2f0] rounded-full overflow-hidden">
                    <div
                        className={cn('h-full rounded-full transition-all', barColor)}
                        style={{ width: `${score}%` }}
                    />
                </div>
                {reasons.length > 0 && (
                    <p className="text-[10px] text-[#8a8a84] leading-relaxed truncate">
                        {reasons[0]}
                    </p>
                )}
            </div>
        </div>
    )
}