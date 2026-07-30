import { formatCurrency } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'

interface SpendingBreakdownProps {
    transactions: TransactionWithDetails[]
}

export function SpendingBreakdown({ transactions }: SpendingBreakdownProps) {
    const expenses = transactions.filter(t => t.type === 'expense')
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
    if (totalExpense === 0) return null

    const map = new Map<string, { name: string; amount: number; color: string | null }>()
    for (const tx of expenses) {
        const key = tx.category?.id ?? '__none__'
        const existing = map.get(key)
        if (existing) existing.amount += tx.amount
        else map.set(key, {
            name: tx.category?.name ?? 'Uncategorized',
            amount: tx.amount,
            color: tx.category?.color ?? null,
        })
    }

    const categories = Array.from(map.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

    return (
        <div className="rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden">
            <div className="px-4 pt-3.5 pb-0">
                <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">
                    Breakdown
                </p>
            </div>

            {/* Stacked bar */}
            <div className="flex h-1.5 mx-4 mt-2.5 rounded-full overflow-hidden gap-px">
                {categories.map((cat, i) => {
                    const pct = Math.round((cat.amount / totalExpense) * 100)
                    return (
                        <div
                            key={i}
                            className="h-full"
                            style={{
                                width: `${pct}%`,
                                background: cat.color ?? '#94a3b8',
                            }}
                        />
                    )
                })}
            </div>

            {/* Category list */}
            <div className="mt-2.5 px-4 space-y-2 pb-1">
                {categories.map((cat, i) => {
                    const pct = Math.round((cat.amount / totalExpense) * 100)
                    return (
                        <div key={i} className="flex items-center gap-2.5">
                            <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: cat.color ?? '#94a3b8' }}
                            />
                            <span className="text-[12px] text-[#252525] flex-1">{cat.name}</span>
                            <span className="text-[11px] text-[#8a8a84] w-7 text-right">{pct}%</span>
                            <span className="text-[13px] text-[#252525] w-24 text-right">
                                {formatCurrency(cat.amount)}
                            </span>
                        </div>
                    )
                })}
            </div>

            <div className="flex justify-between mx-4 mt-2.5 pt-2.5 pb-3.5 border-t border-[#f2f2f0]">
                <span className="text-[11px] text-[#8a8a84]">Total spent</span>
                <span className="text-[13px] text-[#252525]">{formatCurrency(totalExpense)}</span>
            </div>
        </div>
    )
}