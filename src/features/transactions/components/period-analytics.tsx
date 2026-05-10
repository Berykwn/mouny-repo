import { formatCurrency } from '@/lib/helpers'
import type { TransactionWithDetails, PayPeriod } from '@/types'
import { cn } from '@/lib/utils'

interface PeriodAnalyticsProps {
    transactions: TransactionWithDetails[]
    period: PayPeriod
}

export function PeriodAnalytics({ transactions, period }: PeriodAnalyticsProps) {
    const expenses = transactions.filter(t => t.type === 'expense')
    const incomes = transactions.filter(t => t.type === 'income')

    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)
    const expectedIncome = period.salary_amount
    const net = totalIncome - totalExpense

    const start = new Date(period.start_date)
    const end = period.end_date ? new Date(period.end_date) : new Date()
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
    const dailyAvg = totalExpense / days

    const spentPercent = expectedIncome > 0
        ? Math.round((totalExpense / expectedIncome) * 100)
        : 0

    const categoryMap = new Map<string, { name: string; amount: number; color: string | null }>()
    for (const tx of expenses) {
        if (!tx.category) continue
        const existing = categoryMap.get(tx.category.id)
        if (existing) existing.amount += tx.amount
        else categoryMap.set(tx.category.id, {
            name: tx.category.name,
            amount: tx.amount,
            color: tx.category.color,
        })
    }
    const topCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

    const biggestExpense = expenses.reduce<TransactionWithDetails | null>(
        (max, tx) => (!max || tx.amount > max.amount ? tx : max), null
    )

    const dailyMap = new Map<string, number>()
    for (const tx of expenses) {
        dailyMap.set(tx.date, (dailyMap.get(tx.date) ?? 0) + tx.amount)
    }
    const biggestDay = Array.from(dailyMap.entries()).sort((a, b) => b[1] - a[1])[0]

    return (
        <div className="space-y-3 pt-3">
            <div className="rounded-2xl border border-neutral-200 bg-card p-4 space-y-3">
                <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Net this period</p>
                    <p className={cn(
                        'text-3xl font-bold tracking-tight',
                        net < 0 ? 'text-destructive' : ''
                    )}>
                        {net >= 0 ? '+' : ''}{formatCurrency(net)}
                    </p>
                </div>

                <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all',
                                spentPercent >= 100 ? 'bg-destructive' :
                                    spentPercent >= 80 ? 'bg-amber-500' : 'bg-foreground'
                            )}
                            style={{ width: `${Math.min(spentPercent, 100)}%` }}
                        />
                    </div>
                    <p className={cn(
                        'text-xs',
                        spentPercent >= 100 ? 'text-destructive font-medium' : 'text-muted-foreground'
                    )}>
                        {spentPercent}% of income spent
                    </p>
                </div>

                <div className="border-t pt-3 grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-xs text-muted-foreground">Income</p>
                        <p className="text-sm font-semibold text-green-600">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Spent</p>
                        <p className="text-sm font-semibold">{formatCurrency(totalExpense)}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-card">
                <div className="px-4 pt-3 pb-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                        Stats
                    </p>
                </div>

                {[
                    {
                        label: 'Daily average',
                        value: formatCurrency(dailyAvg),
                        sub: `over ${days} days`,
                    },
                    {
                        label: 'Biggest day',
                        value: biggestDay ? formatCurrency(biggestDay[1]) : '—',
                        sub: biggestDay
                            ? new Date(biggestDay[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            : undefined,
                    },
                    {
                        label: 'Biggest expense',
                        value: biggestExpense ? formatCurrency(biggestExpense.amount) : '—',
                        sub: biggestExpense?.note || biggestExpense?.category?.name,
                    },
                    {
                        label: 'Transactions',
                        value: String(transactions.length),
                        sub: `${expenses.length} out · ${incomes.length} in`,
                    },
                ].map((item, i, arr) => (
                    <div
                        key={item.label}
                        className={cn(
                            'flex items-center justify-between px-4 py-2.5',
                            i < arr.length - 1 && 'border-b'
                        )}
                    >
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <div className="text-right">
                            <p className="text-sm font-semibold">{item.value}</p>
                            {item.sub && (
                                <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {topCategories.length > 0 && (
                <div className="rounded-xl border border-neutral-200 bg-card">
                    <div className="px-4 pt-3 pb-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                            Breakdown
                        </p>
                    </div>

                    <div className="px-4 pb-3">
                        <div className="h-2 rounded-full overflow-hidden flex gap-0.5">
                            {topCategories.map((cat, i) => {
                                const pct = totalExpense > 0
                                    ? (cat.amount / totalExpense) * 100
                                    : 0
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            width: `${pct}%`,
                                            backgroundColor: cat.color ?? '#94a3b8',
                                        }}
                                    />
                                )
                            })}

                            {(() => {
                                const covered = topCategories.reduce((s, c) =>
                                    s + (totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0), 0)
                                return covered < 99 ? (
                                    <div
                                        className="flex-1 bg-muted-foreground/20"
                                    />
                                ) : null
                            })()}
                        </div>
                    </div>

                    {topCategories.map((cat, i, arr) => {
                        const pct = totalExpense > 0
                            ? Math.round((cat.amount / totalExpense) * 100)
                            : 0
                        return (
                            <div
                                key={i}
                                className={cn(
                                    'flex items-center justify-between px-4 py-2.5',
                                    i < arr.length - 1 && 'border-b'
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: cat.color ?? '#94a3b8' }}
                                    />
                                    <p className="text-sm">{cat.name}</p>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-muted-foreground">{pct}%</span>
                                    <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                                </div>
                            </div>
                        )
                    })}

                    <div className="flex items-center justify-between px-4 py-2.5 border-t">
                        <p className="text-xs text-muted-foreground">Total spent</p>
                        <p className="text-sm font-semibold">{formatCurrency(totalExpense)}</p>
                    </div>
                </div>
            )}
        </div>
    )
}