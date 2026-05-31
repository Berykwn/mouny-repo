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
        score >= 80 ? 'text-emerald-600' :
            score >= 60 ? 'text-amber-500' :
                score >= 40 ? 'text-orange-500' : 'text-destructive'

    const barColor =
        score >= 80 ? 'bg-emerald-500' :
            score >= 60 ? 'bg-amber-500' :
                score >= 40 ? 'bg-orange-500' : 'bg-destructive'

    const hasTrend = trendPeriods.length >= 2

    return (
        <div className="rounded-2xl border border-neutral-200 bg-card px-5 py-4 space-y-4">
            {/* Spending Trend Table */}
            <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground tracking-wide">Spending Trend</p>

                {!hasTrend ? (
                    <p className="text-[12px] text-muted-foreground">
                        Not enough data. Trend will appear after the first period closes.
                    </p>
                ) : (
                    <div>
                        <div className="grid grid-cols-4 pb-1.5 border-b">
                            <p className="text-[10px] text-muted-foreground">Period</p>
                            <p className="text-[10px] text-muted-foreground text-right">Income</p>
                            <p className="text-[10px] text-muted-foreground text-right">Expense</p>
                            <p className="text-[10px] text-muted-foreground text-right">vs prev</p>
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
                                        i < trendPeriods.length - 1 && 'border-b border-dashed'
                                    )}
                                >
                                    <div className="flex items-center gap-1">
                                        {isActive && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-foreground inline-block" />
                                        )}
                                        <p className={cn(
                                            'text-[11px]',
                                            isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                                        )}>
                                            {p.label}
                                        </p>
                                    </div>
                                    <p className={cn(
                                        'text-[11px] text-right',
                                        isActive ? 'text-emerald-600 font-medium' : 'text-muted-foreground'
                                    )}>
                                        {formatShortCurrency(p.income)}
                                    </p>
                                    <p className={cn(
                                        'text-[11px] text-right',
                                        isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                                    )}>
                                        {formatShortCurrency(p.expense)}
                                    </p>
                                    <p className={cn(
                                        'text-[11px] text-right',
                                        diffPct === null ? 'text-muted-foreground' :
                                            diffPct <= 0 ? 'text-emerald-600' : 'text-destructive'
                                    )}>
                                        {diffPct === null ? '—' : diffPct === 0 ? '0%' : `${diffPct > 0 ? '↑' : '↓'}${Math.abs(diffPct)}%`}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="border-t" />

            {/* Health Score */}
            <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground tracking-wide">Financial Health</p>
                <div className="flex items-end justify-between">
                    <p className={cn('text-[22px] leading-none font-medium', scoreColor)}>{label}</p>
                    <p className={cn('text-[32px] leading-none font-medium', scoreColor)}>{score}</p>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn('h-full rounded-full transition-all', barColor)}
                        style={{ width: `${score}%` }}
                    />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {reasons.join(' · ')}
                </p>
            </div>
        </div>
    )
}