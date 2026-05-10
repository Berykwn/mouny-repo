// pages/dashboard/index.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { payPeriodsService } from '@/services/pay-periods.service'
import { transactionsService } from '@/services/transactions.service'
import { debtsService } from '@/services/debts.service'
import { wishListService } from '@/services/wish-list.service'
import { formatCurrency, daysUntil } from '@/lib/helpers'
import type { Database } from '@/types/database.types'
import type { TransactionWithDetails, DebtWithAccount, WishListItem } from '@/types'
import type { WishListAnalysis } from '@/services/wish-list.service'
import { cn } from '@/lib/utils'
import { SpendingBreakdown } from './components/spending-breakdown'
import { LoadingContent } from '@/components/loading-content'
import NoPeriod from '@/components/no-period'

type ActiveSummary = Database['public']['Views']['active_period_summary']['Row']

interface DashboardData {
    summary: ActiveSummary
    transactions: TransactionWithDetails[]
    prevTransactions: TransactionWithDetails[]
    debts: DebtWithAccount[]
    wishItems: WishListItem[]
    wishAnalysis: Record<string, WishListAnalysis>
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const [
                { data: summary },
                { data: allPeriods },
                { data: debts },
            ] = await Promise.all([
                payPeriodsService.getActiveSummary(),
                payPeriodsService.getAll(),
                debtsService.getActive(),
            ])

            if (!summary) { setLoading(false); return }

            const { data: txs } = await transactionsService.getByPeriod(summary.period_id!)
            const closedPeriods = (allPeriods ?? []).filter(p => p.status === 'closed')
            const prevPeriod = closedPeriods[0] ?? null
            const prevTxs = prevPeriod
                ? (await transactionsService.getByPeriod(prevPeriod.id)).data ?? []
                : []

            const { data: wishItems } = await wishListService.getAll()
            const list = wishItems ?? []
            const { data: wishAnalysis } = await wishListService.analyze(list)

            setData({
                summary,
                transactions: txs ?? [],
                prevTransactions: prevTxs,
                debts: debts ?? [],
                wishItems: list,
                wishAnalysis: wishAnalysis ?? {},
            })
            setLoading(false)
        }
        load()
    }, [])

    if (loading) return <section className="p-4"><LoadingContent /></section>
    if (!data) return <section className="px-4"><NoPeriod /></section>

    const { summary, transactions, prevTransactions, debts, wishItems, wishAnalysis } = data

    const totalIncome = summary.total_income ?? 0
    const totalExpense = summary.total_expense ?? 0
    const expectedIncome = summary.salary_amount ?? 0
    const remaining = totalIncome - totalExpense
    const spentPercent = expectedIncome > 0
        ? Math.min(Math.round((totalExpense / expectedIncome) * 100), 100)
        : 0

    const prevExpense = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const prevIncome = prevTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

    const expenseDiffPct = prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100) : null
    const incomeDiffPct = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : null

    // Insight: biggest spending driver vs prev period
    const expenses = transactions.filter(t => t.type === 'expense')
    const prevExpenses = prevTransactions.filter(t => t.type === 'expense')
    const catMap = new Map<string, { name: string; cur: number; prev: number }>()
    for (const tx of expenses) {
        const key = tx.category?.id ?? '__none__'
        const name = tx.category?.name ?? 'Uncategorized'
        const e = catMap.get(key) ?? { name, cur: 0, prev: 0 }
        e.cur += tx.amount
        catMap.set(key, e)
    }
    for (const tx of prevExpenses) {
        const key = tx.category?.id ?? '__none__'
        const name = tx.category?.name ?? 'Uncategorized'
        const e = catMap.get(key) ?? { name, cur: 0, prev: 0 }
        e.prev += tx.amount
        catMap.set(key, e)
    }
    const biggestDriver = Array.from(catMap.values())
        .filter(c => c.prev > 0 && c.cur > c.prev)
        .sort((a, b) => (b.cur - b.prev) - (a.cur - a.prev))[0] ?? null
    const driverMultiple = biggestDriver
        ? Math.round((biggestDriver.cur / biggestDriver.prev) * 10) / 10
        : null

    const upcomingDebts = debts
        .filter(d => d.due_date && daysUntil(d.due_date) <= 30)
        .sort((a, b) => daysUntil(a.due_date!) - daysUntil(b.due_date!))
        .slice(0, 3)

    const affordableWishes = wishItems.filter(w => {
        const a = wishAnalysis[w.id]
        return a && a.canAfford && !w.is_purchased
    }).slice(0, 3)

    const remainingIsNegative = remaining < 0

    return (
        <div className="p-4 space-y-2.5">

            {/* Hero card */}
            <div className={cn(
                'rounded-2xl border border-neutral-200 bg-card p-5 space-y-4',
                remainingIsNegative && 'border-red-100 dark:border-red-900'
            )}>
                <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Remaining</p>
                    <p className={cn(
                        'text-[44px] leading-none tracking-tight',
                        remainingIsNegative ? 'text-destructive' : 'text-foreground'
                    )}>
                        {formatCurrency(remaining)}
                    </p>
                </div>

                <div className="space-y-1.5">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all',
                                spentPercent >= 90 ? 'bg-destructive' :
                                    spentPercent >= 70 ? 'bg-amber-500' : 'bg-foreground'
                            )}
                            style={{ width: `${spentPercent}%` }}
                        />
                    </div>
                    <p className={cn(
                        'text-[11px]',
                        spentPercent >= 90 ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                        {spentPercent}% of income spent
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-0 pt-3 border-t">
                    <div className="pr-4">
                        <p className="text-[10px] text-muted-foreground tracking-wide mb-1">Income</p>
                        <p className="text-[20px] leading-none text-emerald-600 mb-1">
                            {formatCurrency(totalIncome)}
                        </p>
                        {incomeDiffPct !== null && (
                            <p className={cn(
                                'text-[10px] flex items-center gap-1',
                                incomeDiffPct >= 0 ? 'text-emerald-600' : 'text-destructive'
                            )}>
                                {incomeDiffPct >= 0 ? '↑' : '↓'} {Math.abs(incomeDiffPct)}% from last
                            </p>
                        )}
                    </div>
                    <div className="pl-4 border-l">
                        <p className="text-[10px] text-muted-foreground tracking-wide mb-1">Spent</p>
                        <p className="text-[20px] leading-none text-foreground mb-1">
                            {formatCurrency(totalExpense)}
                        </p>
                        {expenseDiffPct !== null && (
                            <p className={cn(
                                'text-[10px] flex items-center gap-1',
                                expenseDiffPct <= 0 ? 'text-emerald-600' : 'text-destructive'
                            )}>
                                {expenseDiffPct >= 0 ? '↑' : '↓'} {Math.abs(expenseDiffPct)}% from last
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Insight */}
            {biggestDriver && driverMultiple && driverMultiple > 1.2 && (
                <div className="rounded-2xl border border-neutral-200 bg-card px-5 py-3.5">
                    <p className="text-[11px] text-muted-foreground italic leading-relaxed border-l-2 border-border pl-3">
                        <span className="text-foreground not-italic font-medium">{biggestDriver.name}</span>
                        {' '}up {driverMultiple}× vs last period — biggest driver this month.
                    </p>
                </div>
            )}

            {/* Spending breakdown */}
            {transactions.length > 0 && (
                <SpendingBreakdown transactions={transactions} />
            )}

            {/* Upcoming debts */}
            {upcomingDebts.length > 0 && (
                <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-5 pt-4 pb-0">
                        <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">
                            Upcoming debts
                        </p>
                        <button
                            onClick={() => navigate('/debts')}
                            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            See all →
                        </button>
                    </div>
                    <div className="mt-3 divide-y">
                        {upcomingDebts.map(debt => {
                            const days = daysUntil(debt.due_date!)
                            const isOverdue = days < 0
                            const isUrgent = days >= 0 && days <= 7
                            return (
                                <div
                                    key={debt.id}
                                    className={cn(
                                        'flex justify-between items-center px-5 py-3',
                                        isOverdue && 'bg-red-50 dark:bg-red-950/30'
                                    )}
                                >
                                    <div>
                                        <p className="text-[12px] font-medium">{debt.counterparty}</p>
                                        <p className={cn(
                                            'text-[10px] mt-0.5',
                                            isOverdue ? 'text-destructive' :
                                                isUrgent ? 'text-amber-500' : 'text-muted-foreground'
                                        )}>
                                            {isOverdue
                                                ? `${Math.abs(days)} days overdue`
                                                : days === 0 ? 'Due today'
                                                    : `${days} days left`}
                                        </p>
                                    </div>
                                    <p className="text-[14px]">
                                        {formatCurrency(debt.remaining_amount)}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* You can afford */}
            {affordableWishes.length > 0 && (
                <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-5 pt-4 pb-0">
                        <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">
                            You can afford
                        </p>
                        <button
                            onClick={() => navigate('/wish-list')}
                            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            See all →
                        </button>
                    </div>
                    <div className="mt-3 divide-y">
                        {affordableWishes.map(item => {
                            const a = wishAnalysis[item.id]
                            return (
                                <div key={item.id} className="flex justify-between items-center px-5 py-3">
                                    <div>
                                        <p className="text-[12px] font-medium">{item.name}</p>
                                        {a?.salaryLabel && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{a.salaryLabel}</p>
                                        )}
                                    </div>
                                    {item.estimated_price && (
                                        <p className="text-[14px] text-emerald-600">
                                            {formatCurrency(item.estimated_price)}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}