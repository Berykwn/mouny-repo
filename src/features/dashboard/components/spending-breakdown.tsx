// pages/dashboard/components/spending-breakdown.tsx
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
        <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden">
            <div className="px-5 pt-4 pb-0">
                <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">
                    Breakdown
                </p>
            </div>

            {/* Stacked bar */}
            <div className="flex h-1.5 mx-5 mt-3 rounded-full overflow-hidden gap-px">
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
            <div className="mt-3 px-5 space-y-2.5 pb-1">
                {categories.map((cat, i) => {
                    const pct = Math.round((cat.amount / totalExpense) * 100)
                    return (
                        <div key={i} className="flex items-center gap-2.5">
                            <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: cat.color ?? '#94a3b8' }}
                            />
                            <span className="text-[12px] text-foreground flex-1">{cat.name}</span>
                            <span className="text-[11px] text-muted-foreground w-7 text-right">{pct}%</span>
                            <span className="text-[13px] w-24 text-right">
                                {formatCurrency(cat.amount)}
                            </span>
                        </div>
                    )
                })}
            </div>

            <div className="flex justify-between mx-5 mt-3 pt-3 pb-4 border-t">
                <span className="text-[11px] text-muted-foreground">Total spent</span>
                <span className="text-[13px]">{formatCurrency(totalExpense)}</span>
            </div>
        </div>
    )
}