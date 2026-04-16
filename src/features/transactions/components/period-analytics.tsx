import { formatCurrency } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'
import type { PayPeriod } from '@/types'
import { Wallet, Calendar, Tag, Zap, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PeriodAnalyticsProps {
    transactions: TransactionWithDetails[]
    period: PayPeriod
}

interface StatCardProps {
    icon: React.ElementType
    iconClass: string
    label: string
    value: string
    sub?: string
}

function StatCard({ icon: Icon, iconClass, label, value, sub }: StatCardProps) {
    return (
        <div className="rounded-xl border bg-card p-3 space-y-2">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', iconClass)}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold leading-tight">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

export function PeriodAnalytics({ transactions, period }: PeriodAnalyticsProps) {
    const expenses = transactions.filter(t => t.type === 'expense')
    const incomes = transactions.filter(t => t.type === 'income')

    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)
    const expectedIncome = period.salary_amount
    const net = totalIncome - totalExpense
    const closingBalance = period.closing_balance ?? 0

    const start = new Date(period.start_date)
    const end = period.end_date ? new Date(period.end_date) : new Date()
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
    const dailyAvg = totalExpense / days

    // % of expected income
    const spentPercent = expectedIncome > 0
        ? Math.round((totalExpense / expectedIncome) * 100)
        : 0

    const categoryMap = new Map<string, { name: string; amount: number; color: string | null }>()
    for (const tx of expenses) {
        if (!tx.category) continue
        const existing = categoryMap.get(tx.category.id)
        if (existing) {
            existing.amount += tx.amount
        } else {
            categoryMap.set(tx.category.id, {
                name: tx.category.name,
                amount: tx.amount,
                color: tx.category.color,
            })
        }
    }
    const topCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4)

    // Biggest single expense
    const biggestExpense = expenses.reduce<TransactionWithDetails | null>(
        (max, tx) => (!max || tx.amount > max.amount ? tx : max), null
    )

    // Biggest spending day
    const dailyMap = new Map<string, number>()
    for (const tx of expenses) {
        dailyMap.set(tx.date, (dailyMap.get(tx.date) ?? 0) + tx.amount)
    }
    const biggestDay = Array.from(dailyMap.entries())
        .sort((a, b) => b[1] - a[1])[0]

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4 space-y-3">
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
                                'h-full rounded-full',
                                spentPercent >= 100 ? 'bg-destructive' :
                                    spentPercent >= 80 ? 'bg-amber-500' : 'bg-foreground'
                            )}
                            style={{ width: `${Math.min(spentPercent, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {spentPercent}% of expected income spent
                    </p>
                </div>

                <div className="border-t pt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                        <p className="text-xs text-muted-foreground">Expected</p>
                        <p className="text-xs font-semibold">{formatCurrency(expectedIncome)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Spent</p>
                        <p className="text-xs font-semibold text-destructive">{formatCurrency(totalExpense)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Closing</p>
                        <p className="text-xs font-semibold">{formatCurrency(closingBalance)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                <StatCard
                    icon={BarChart2}
                    iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                    label="Daily average"
                    value={formatCurrency(dailyAvg)}
                    sub={`over ${days} days`}
                />
                <StatCard
                    icon={Zap}
                    iconClass="bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400"
                    label="Biggest day"
                    value={biggestDay ? formatCurrency(biggestDay[1]) : '—'}
                    sub={biggestDay
                        ? new Date(biggestDay[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : undefined
                    }
                />
                <StatCard
                    icon={Wallet}
                    iconClass="bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400"
                    label="Biggest expense"
                    value={biggestExpense ? formatCurrency(biggestExpense.amount) : '—'}
                    sub={biggestExpense?.note || biggestExpense?.category?.name}
                />
                <StatCard
                    icon={Calendar}
                    iconClass="bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400"
                    label="Transactions"
                    value={String(transactions.length)}
                    sub={`${expenses.length} out · ${incomes.length} in`}
                />
            </div>

            {topCategories.length > 0 && (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Top spending categories
                        </p>
                    </div>
                    <div className="space-y-2.5">
                        {topCategories.map((cat, i) => {
                            const pct = totalExpense > 0
                                ? Math.round((cat.amount / totalExpense) * 100)
                                : 0
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
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <span>{pct}%</span>
                                            <span className="font-medium text-foreground">
                                                {formatCurrency(cat.amount)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
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
                </div>
            )}
        </div>
    )
}