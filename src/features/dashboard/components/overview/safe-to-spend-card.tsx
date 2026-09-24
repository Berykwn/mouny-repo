import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'

interface SafeToSpendCardProps {
    totalIncome: number
    totalExpense: number
    remaining: number
    spentPercent: number
}

export function SafeToSpendCard({
    totalIncome,
    totalExpense,
    remaining,
    spentPercent,
}: SafeToSpendCardProps) {
    const isNegative = remaining < 0

    return (
        <div className="card px-5 py-[22px]">
            <p className="text-[11px] font-normal uppercase tracking-[.14em] text-muted-ink">
                Safe to spend
            </p>
            <p
                className={cn(
                    'mt-1.5 text-[38px] font-medium leading-none tracking-[-.03em] tabular-nums',
                    isNegative ? 'text-negative' : 'text-ink'
                )}
            >
                {formatCurrency(remaining)}
            </p>

            <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
                <div
                    className={cn('h-full', isNegative ? 'bg-negative' : 'bg-brand')}
                    style={{ width: `${spentPercent}%` }}
                />
                <div className="h-full w-px bg-white" />
                <div className="h-full flex-1 bg-brand-soft" />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11.5px]">
                <span className="text-muted-ink">Spent {formatCurrency(totalExpense)}</span>
                <span className="text-muted-ink">of {formatCurrency(totalIncome)} income</span>
            </div>
        </div>
    )
}
