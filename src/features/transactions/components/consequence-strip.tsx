import { CircleAlert, CircleCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

interface ConsequenceStripProps {
    safeToSpend: number
    amount: number
    type: 'income' | 'expense'
}

export function ConsequenceStrip({ safeToSpend, amount, type }: ConsequenceStripProps) {
    const after = type === 'expense' ? safeToSpend - amount : safeToSpend + amount
    const isOver = type === 'expense' && after < 0

    if (isOver) {
        return (
            <div className="flex items-center gap-2.5 rounded-xl bg-[#fef2f2] px-3.5 py-3">
                <CircleAlert className="w-[15px] h-[15px] text-[#b91c1c] shrink-0" strokeWidth={2} />
                <p className="text-[12px] text-[#b91c1c]">
                    Puts you <span className="font-semibold">{formatCurrency(Math.abs(after))}</span> over.
                </p>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2.5 rounded-xl bg-[#f7faf2] px-3.5 py-3">
            <CircleCheck className="w-[15px] h-[15px] text-[#6FA82B] shrink-0" strokeWidth={2} />
            <p className="text-[12px] text-[#4d7a1d]">
                {type === 'expense' ? (
                    <>Leaves <span className="font-semibold">{formatCurrency(after)}</span> safe to spend this period.</>
                ) : (
                    <>Adds <span className="font-semibold">{formatCurrency(amount)}</span> to safe to spend this period.</>
                )}
            </p>
        </div>
    )
}
