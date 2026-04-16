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
import { CreditCard, ShoppingBag, } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SpendingBreakdown } from './components/spending-breakdown'
import { PeriodComparison } from './components/period-comparison'
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

            // Active period transactions
            const { data: txs } = await transactionsService.getByPeriod(summary.period_id!)

            // Previous closed period transactions (for comparison)
            const closedPeriods = (allPeriods ?? []).filter(p => p.status === 'closed')
            const prevPeriod = closedPeriods[0] ?? null
            const prevTxs = prevPeriod
                ? (await transactionsService.getByPeriod(prevPeriod.id)).data ?? []
                : []

            // Wish list
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

    if (loading) {
        return (
            <section className='p-4'>
                <LoadingContent />
            </section>
        )
    }

    if (!data) {
        return (
            <section className="px-4">
                <NoPeriod />
            </section>
        )
    }

    const { summary, transactions, prevTransactions, debts, wishItems, wishAnalysis } = data

    // Correct remaining calculation (not using view's estimated_remaining)
    const expectedIncome = summary.salary_amount ?? 0
    const totalIncome = summary.total_income ?? 0
    const totalExpense = summary.total_expense ?? 0
    const remaining = expectedIncome + totalIncome - totalExpense

    const spentPercent = expectedIncome > 0
        ? Math.min(Math.round((totalExpense / expectedIncome) * 100), 100)
        : 0

    // Prev period stats for comparison
    const prevExpense = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const prevIncome = prevTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

    // Upcoming debts (due within 30 days)
    const upcomingDebts = debts
        .filter(d => d.due_date && daysUntil(d.due_date) <= 30)
        .sort((a, b) => daysUntil(a.due_date!) - daysUntil(b.due_date!))
        .slice(0, 3)

    // Affordable wish items
    const affordableWishes = wishItems.filter(w => {
        const a = wishAnalysis[w.id]
        return a && a.canAfford && !w.is_purchased
    }).slice(0, 3)

    const remainingIsNegative = remaining < 0

    return (
        <div className="p-4 md:p-6 space-y-3 max-w-2xl mx-auto">
            <div className={cn(
                'rounded-2xl border p-4 space-y-4',
                remainingIsNegative
                    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                    : 'bg-card'
            )}>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Remaining this period</p>
                    <p className={cn(
                        'text-4xl font-bold tracking-tight',
                        remainingIsNegative ? 'text-destructive' : ''
                    )}>
                        {formatCurrency(remaining)}
                    </p>
                </div>

                <div className="space-y-1.5">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all',
                                spentPercent >= 90 ? 'bg-destructive' :
                                    spentPercent >= 70 ? 'bg-amber-500' : 'bg-foreground'
                            )}
                            style={{ width: `${spentPercent}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {spentPercent}% of expected income spent
                    </p>
                </div>
            </div>

            {transactions.length > 0 && (
                <SpendingBreakdown transactions={transactions} />
            )}

            {prevTransactions.length > 0 && (
                <PeriodComparison
                    currentExpense={totalExpense}
                    currentIncome={totalIncome}
                    prevExpense={prevExpense}
                    prevIncome={prevIncome}
                />
            )}

            {upcomingDebts.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Upcoming debts
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/debts')}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            See all →
                        </button>
                    </div>
                    <div className="space-y-2">
                        {upcomingDebts.map(debt => {
                            const days = daysUntil(debt.due_date!)
                            const isOverdue = days < 0
                            const isUrgent = days >= 0 && days <= 7
                            return (
                                <div key={debt.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{debt.counterparty}</p>
                                        <p className={cn(
                                            'text-xs font-medium',
                                            isOverdue ? 'text-destructive' :
                                                isUrgent ? 'text-amber-500' : 'text-muted-foreground'
                                        )}>
                                            {isOverdue
                                                ? `${Math.abs(days)} days overdue`
                                                : days === 0 ? 'Due today!'
                                                    : `${days} days left`}
                                        </p>
                                    </div>
                                    <p className="text-sm font-semibold shrink-0 ml-4">
                                        {formatCurrency(debt.remaining_amount)}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {affordableWishes.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                You can afford
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/wish-list')}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            See all →
                        </button>
                    </div>
                    <div className="space-y-2">
                        {affordableWishes.map(item => {
                            const a = wishAnalysis[item.id]
                            return (
                                <div key={item.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{item.name}</p>
                                        {a?.salaryLabel && (
                                            <p className="text-xs text-muted-foreground">{a.salaryLabel}</p>
                                        )}
                                    </div>
                                    {item.estimated_price && (
                                        <p className="text-sm font-semibold text-green-600 shrink-0 ml-4">
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