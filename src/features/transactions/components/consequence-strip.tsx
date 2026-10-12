import { CircleAlert, CircleCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

interface ConsequenceStripProps {
    safeToSpend: number
    amount: number
    type: 'income' | 'expense'
    /** Held back for a bill this expense pays: paying it frees that much again. */
    freed?: number
    billName?: string
}

export function ConsequenceStrip({ safeToSpend, amount, type, freed = 0, billName }: ConsequenceStripProps) {
    const after = type === 'expense' ? safeToSpend - amount + freed : safeToSpend + amount
    const isOver = type === 'expense' && after < 0
    const pays = type === 'expense' && billName ? `Pays ${billName}: ` : ''

    if (isOver) {
        return (
            <div role="status" className="flex items-center gap-2.5 rounded-xl bg-negative-soft px-3.5 py-3">
                <CircleAlert aria-hidden="true" className="w-[15px] h-[15px] text-negative-ink shrink-0" strokeWidth={2} />
                <p className="text-[12px] text-negative-ink">
                    {pays}Puts you <span className="font-semibold">{formatCurrency(Math.abs(after))}</span> over.
                </p>
            </div>
        )
    }

    return (
        <div role="status" className="flex items-center gap-2.5 rounded-xl bg-brand-tint px-3.5 py-3">
            <CircleCheck aria-hidden="true" className="w-[15px] h-[15px] text-brand shrink-0" strokeWidth={2} />
            <p className="text-[12px] text-brand-ink">
                {type === 'expense' ? (
                    <>{pays}Leaves <span className="font-semibold">{formatCurrency(after)}</span> safe to spend this period.</>
                ) : (
                    <>Adds <span className="font-semibold">{formatCurrency(amount)}</span> to safe to spend this period.</>
                )}
            </p>
        </div>
    )
}
