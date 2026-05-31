import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { payPeriodsService } from '@/services/pay-periods.service'
import { transactionsService } from '@/services/transactions.service'
import { debtsService } from '@/services/debts.service'
import { wishListService } from '@/services/wish-list.service'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, formatPeriodLabel } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { SpendingBreakdown } from './spending-breakdown'
import { LoadingContent } from '@/components/loading-content'
import { OverviewData, TrendPoint } from '@/types/overview.types'
import HealthAndTrendSection from './healt-and-trend'
import { calculateHealthScore } from '@/lib/calculate-health-score'

async function fetchOverviewData(
    periodId: string,
    salaryAmount: number
): Promise<OverviewData | null> {
    const [
        { data: allPeriods },
        { data: txs },
        { data: debts },
        { data: accounts },
    ] = await Promise.all([
        payPeriodsService.getAll(),
        transactionsService.getByPeriod(periodId),
        debtsService.getActive(),
        accountsService.getAll(),
    ])

    const allList = allPeriods ?? []
    const periodTxs = txs ?? []

    const currentPeriod = allList.find(p => p.id === periodId)
    if (!currentPeriod) return null

    const currentIndex = allList.findIndex(p => p.id === periodId)
    const prevPeriod = allList[currentIndex + 1] ?? null
    const prevTxs = prevPeriod
        ? (await transactionsService.getByPeriod(prevPeriod.id)).data ?? []
        : []

    const trendPeriods_raw = allList.slice(currentIndex + 1, currentIndex + 3)
    const trendTxsResults = await Promise.all(
        trendPeriods_raw.map(p => transactionsService.getByPeriod(p.id))
    )

    const trendPeriods: TrendPoint[] = [
        ...trendPeriods_raw.map((p, i) => {
            const pts = trendTxsResults[i].data ?? []
            return {
                label: formatPeriodLabel(p.start_date ?? null),
                income: pts.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                expense: pts.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
            }
        }).reverse(),
        {
            label: formatPeriodLabel(currentPeriod.start_date ?? null),
            income: periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            expense: periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        },
    ]

    const { data: wishItems } = await wishListService.getAll()
    const list = wishItems ?? []
    const { data: wishAnalysis } = await wishListService.analyze(list)

    return {
        totalIncome: periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        totalExpense: periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        salaryAmount,
        startDate: currentPeriod.start_date,
        transactions: periodTxs,
        prevTransactions: prevTxs,
        debts: debts ?? [],
        wishItems: list,
        wishAnalysis: wishAnalysis ?? {},
        accounts: accounts ?? [],
        trendPeriods,
        closingBalance: currentPeriod.closing_balance ?? null,
        prevClosingBalance: prevPeriod?.closing_balance ?? null,
    }
}

export function OverviewTransaction({
    periodId,
    salaryAmount,
    isActivePeriod,
}: {
    periodId: string
    salaryAmount: number
    isActivePeriod: boolean
}) {
    const [data, setData] = useState<OverviewData | null>(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        async function load() {
            setLoading(true)
            const result = await fetchOverviewData(periodId, salaryAmount)
            setData(result)
            setLoading(false)
        }
        load()
    }, [periodId, salaryAmount])

    if (loading) return <LoadingContent />
    if (!data) return (
        <section className='p-4 mt-1.5 rounded-2xl bg-card border border-neutral-200'>
            <h2 className='text-sm font-semibold'>Failed to load period data.</h2>
            <p className='text-xs text-muted-foreground mt-1'>Please try again.</p>
        </section>
    )

    const {
        totalIncome,
        totalExpense,
        transactions,
        prevTransactions,
        accounts,
        trendPeriods,
        debts,
        closingBalance,
        prevClosingBalance,
    } = data

    const remaining = totalIncome - totalExpense
    const spentPercent = salaryAmount > 0
        ? Math.min(Math.round((totalExpense / salaryAmount) * 100), 100)
        : 0

    const prevExpense = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const prevIncome = prevTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

    const expenseDiffPct = prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100) : null
    const incomeDiffPct = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : null

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

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
    const totalDebt = debts.reduce((s, d) => s + d.remaining_amount, 0)
    const displayBalance = isActivePeriod ? totalBalance : (closingBalance ?? totalBalance)

    const closingDiffPct: number | null =
        prevClosingBalance !== null && prevClosingBalance > 0
            ? Math.round(((displayBalance - prevClosingBalance) / prevClosingBalance) * 100)
            : null

    const { score, label: healthLabel, reasons: healthReasons } = calculateHealthScore({
        totalIncome,
        totalExpense,
        totalBalance: displayBalance,
        totalDebt,
        expenseDiffPct,
    })

    const remainingIsNegative = remaining < 0

    return (
        <div className="space-y-3 mt-1.5">
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

                {accounts.length > 0 && (
                    <button
                        onClick={() => navigate('/accounts')}
                        className="w-full flex items-center justify-between pt-3 border-t text-left"
                    >
                        <div>
                            <p className="text-[10px] text-muted-foreground tracking-wide mb-0.5">
                                {isActivePeriod ? 'Total Balance' : 'Closing Balance'}
                            </p>
                            <p className="text-[15px] font-medium leading-none">
                                {formatCurrency(displayBalance)}
                            </p>
                            {closingDiffPct !== null && (
                                <p className={cn(
                                    'text-[10px] mt-0.5',
                                    closingDiffPct >= 0 ? 'text-emerald-600' : 'text-destructive'
                                )}>
                                    {closingDiffPct >= 0 ? '↑' : '↓'} {Math.abs(closingDiffPct)}% vs prev period
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <p className="text-[11px] text-muted-foreground">
                                {accounts.length} account{accounts.length > 1 ? 's' : ''}
                            </p>
                            <span className="text-muted-foreground text-[13px]">→</span>
                        </div>
                    </button>
                )}
            </div>

            <HealthAndTrendSection
                score={score}
                label={healthLabel}
                reasons={healthReasons}
                trendPeriods={trendPeriods}
            />

            {biggestDriver && driverMultiple && driverMultiple > 1.2 && (
                <div className="rounded-2xl border border-neutral-200 bg-card px-5 py-3.5">
                    <p className="text-[11px] text-muted-foreground italic leading-relaxed border-l-2 border-border pl-3">
                        <span className="text-foreground not-italic font-medium">{biggestDriver.name}</span>
                        {' '}up {driverMultiple}× vs last period — biggest driver this month.
                    </p>
                </div>
            )}

            {transactions.length > 0 && (
                <SpendingBreakdown transactions={transactions} />
            )}
        </div>
    )
}