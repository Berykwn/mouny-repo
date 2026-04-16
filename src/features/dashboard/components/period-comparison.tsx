import { formatCurrency } from '@/lib/helpers'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PeriodComparisonProps {
    currentExpense: number
    currentIncome: number
    prevExpense: number
    prevIncome: number
}

function DiffBadge({ current, prev, invertColor = false }: {
    current: number
    prev: number
    invertColor?: boolean
}) {
    if (prev === 0) return null
    const diff = current - prev
    const pct = Math.round(Math.abs(diff / prev) * 100)
    const isUp = diff > 0
    const isFlat = diff === 0

    if (isFlat) return (
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Minus className="w-3 h-3" /> same
        </span>
    )

    // For expense: up = bad (red), down = good (green)
    // For income: up = good (green), down = bad (red)
    const isGood = invertColor ? !isUp : isUp
    const Icon = isUp ? TrendingUp : TrendingDown

    return (
        <span className={cn(
            'flex items-center gap-0.5 text-[10px] font-medium',
            isGood ? 'text-green-600' : 'text-destructive'
        )}>
            <Icon className="w-3 h-3" />
            {pct}% {isUp ? 'more' : 'less'}
        </span>
    )
}

export function PeriodComparison({
    currentExpense, currentIncome, prevExpense, prevIncome
}: PeriodComparisonProps) {
    return (
        <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                vs previous period
            </p>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Expense</p>
                    <p className="text-base font-semibold">{formatCurrency(currentExpense)}</p>
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">
                            prev: {formatCurrency(prevExpense)}
                        </p>
                        <DiffBadge current={currentExpense} prev={prevExpense} invertColor />
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Income</p>
                    <p className="text-base font-semibold text-green-600">{formatCurrency(currentIncome)}</p>
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">
                            prev: {formatCurrency(prevIncome)}
                        </p>
                        <DiffBadge current={currentIncome} prev={prevIncome} />
                    </div>
                </div>
            </div>
        </div>
    )
}