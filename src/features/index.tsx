import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { payPeriodsService } from '@/services/pay-periods.service'
import { formatCurrency, formatDate } from '@/lib/helpers'
import type { Database } from '@/types/database.types'
import {
    TrendingDown,
    TrendingUp,
    Wallet,
    ArrowRight,
    CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type ActiveSummary = Database['public']['Views']['active_period_summary']['Row']

export default function DashboardPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [summary, setSummary] = useState<ActiveSummary | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        payPeriodsService.getActiveSummary().then(({ data }) => {
            setSummary(data)
            setLoading(false)
        })
    }, [])

    const firstName = user?.email?.split('@')[0] ?? 'there'

    if (loading) {
        return (
            <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="h-36 w-full rounded-2xl" />
                <div className="grid grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
            </div>
        )
    }

    if (!summary) {
        return (
            <div className="p-4 md:p-6 max-w-2xl mx-auto">
                <div className="mt-16 flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                        <CalendarDays className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold">No active pay period</p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Open a pay period to start tracking your income and expenses.
                        </p>
                    </div>
                    <Button onClick={() => navigate('/settings')}>
                        Go to Settings
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
        )
    }

    const expectedIncome = summary.salary_amount ?? 0
    const totalIncome = summary.total_income ?? 0
    const totalExpense = summary.total_expense ?? 0
    const estimatedRemaining = summary.estimated_remaining ?? 0
    const transactionCount = summary.transaction_count ?? 0

    const spentPercent = expectedIncome > 0
        ? Math.min(Math.round((totalExpense / expectedIncome) * 100), 100)
        : 0

    const remainingIsNegative = estimatedRemaining < 0

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">Hello, {firstName} 👋</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {summary.start_date ? formatDate(summary.start_date) : '—'}
                        {summary.end_date ? ` — ${formatDate(summary.end_date)}` : ' · ongoing'}
                    </p>
                </div>
            </div>

            <div className={cn(
                'rounded-2xl border p-5 space-y-4',
                remainingIsNegative ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : 'bg-card'
            )}>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Estimated remaining</p>
                    <p className={cn(
                        'text-4xl font-bold tracking-tight',
                        remainingIsNegative ? 'text-destructive' : ''
                    )}>
                        {formatCurrency(estimatedRemaining)}
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

            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Wallet className="w-3.5 h-3.5 shrink-0" />
                        <p className="text-xs truncate">Expected</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(expectedIncome)}</p>
                </div>

                <div className="rounded-xl border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <p className="text-xs truncate">Income</p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(totalIncome)}</p>
                </div>

                <div className="rounded-xl border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                        <p className="text-xs truncate">Expense</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(totalExpense)}</p>
                </div>
            </div>

            {transactionCount > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    {transactionCount} transaction{transactionCount !== 1 ? 's' : ''} this period
                </p>
            )}
        </div>
    )
}