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
        <div className="rounded-[20px] border border-[#e5e5e5] bg-white px-5 py-[22px]">
            <p className="text-[11px] font-normal uppercase tracking-[.14em] text-[#8a8a84]">
                Safe to spend
            </p>
            <p
                className={cn(
                    'mt-1.5 text-[38px] font-medium leading-none tracking-[-.03em] tabular-nums',
                    isNegative ? 'text-[#dc2626]' : 'text-[#252525]'
                )}
            >
                {formatCurrency(remaining)}
            </p>

            <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-[#f2f2f0]">
                <div
                    className="h-full bg-[#252525]"
                    style={{ width: `${spentPercent}%` }}
                />
                <div className="h-full w-px bg-white" />
                <div className="h-full flex-1 bg-[#e3e8db]" />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11.5px]">
                <span className="text-[#8a8a84]">Spent {formatCurrency(totalExpense)}</span>
                <span className="text-[#8a8a84]">of {formatCurrency(totalIncome)} income</span>
            </div>
        </div>
    )
}
