import { formatCurrency } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'
import { Tag } from 'lucide-react'

interface SpendingBreakdownProps {
    transactions: TransactionWithDetails[]
}

export function SpendingBreakdown({ transactions }: SpendingBreakdownProps) {
    const expenses = transactions.filter(t => t.type === 'expense')
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)

    if (totalExpense === 0) return null

    // Group by category
    const map = new Map<string, { name: string; amount: number; color: string | null }>()
    for (const tx of expenses) {
        const key = tx.category?.id ?? '__none__'
        const name = tx.category?.name ?? 'Uncategorized'
        const color = tx.category?.color ?? null
        const existing = map.get(key)
        if (existing) existing.amount += tx.amount
        else map.set(key, { name, amount: tx.amount, color })
    }

    const categories = Array.from(map.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

    return (
        <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Spending breakdown
                </p>
            </div>

            <div className="space-y-3">
                {categories.map((cat, i) => {
                    const pct = Math.round((cat.amount / totalExpense) * 100)
                    return (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: cat.color ?? '#94a3b8' }}
                                    />
                                    <span className="font-medium">{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <span>{pct}%</span>
                                    <span className="font-semibold text-foreground w-24 text-right">
                                        {formatCurrency(cat.amount)}
                                    </span>
                                </div>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${pct}%`,
                                        backgroundColor: cat.color ?? '#94a3b8',
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="border-t pt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total spent</span>
                <span className="font-semibold">{formatCurrency(totalExpense)}</span>
            </div>
        </div>
    )
}