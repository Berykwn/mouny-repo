import { CircleAlert } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

interface ConsequenceStripProps {
    /** What's left of the period before this entry (bills still due held back). */
    leftThisPeriod: number
    amount: number
    type: 'income' | 'expense'
    /** Held back for a bill this expense pays: paying it frees that much again. */
    freed?: number
    billName?: string
}

/**
 * One quiet line under the form: where this entry leaves the period. It's the period's
 * total, so it says "left this period"; "safe to spend" is Home's per-day number.
 */
export function ConsequenceStrip({ leftThisPeriod, amount, type, freed = 0, billName }: ConsequenceStripProps) {
    const after = type === 'expense' ? leftThisPeriod - amount + freed : leftThisPeriod + amount
    const isOver = type === 'expense' && after < 0
    const pays = type === 'expense' && billName ? `Pays ${billName}: ` : ''

    if (isOver) {
        return (
            <p role="status" className="flex items-center gap-1.5 text-[13px] text-negative-ink">
                <CircleAlert aria-hidden="true" className="w-[15px] h-[15px] shrink-0" strokeWidth={2} />
                <span>{pays}Puts you <span className="font-semibold">{formatCurrency(Math.abs(after))}</span> over for this period.</span>
            </p>
        )
    }

    return (
        <p role="status" className="text-[13px] text-muted-ink">
            {type === 'expense' ? (
                <>{pays}Leaves <span className="font-semibold text-ink">{formatCurrency(after)}</span> left this period.</>
            ) : (
                <>Adds <span className="font-semibold text-ink">{formatCurrency(amount)}</span> to what’s left this period.</>
            )}
        </p>
    )
}
