import { useMemo } from 'react'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { getTopExpenseCategory } from '../../lib/group-expenses-by-category'
import { groupExpensesByWeekday } from '../../lib/group-expenses-by-weekday'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { TransactionWithDetails } from '@/types'

type Tone = 'warning' | 'positive' | 'info' | 'neutral'
interface Insight { id: string; tone: Tone; text: string }

const TONE_CLASSES: Record<Tone, string> = {
    warning: 'border-warning text-warning',
    positive: 'border-brand text-positive',
    info: 'border-info text-info',
    neutral: 'border-line text-muted-ink',
}

function generateInsights(transactions: TransactionWithDetails[], stats: PeriodStats): Insight[] {
    if (stats.totalExpense <= 0) {
        return [{ id: 'no-spend', tone: 'neutral', text: 'No spending recorded yet this period.' }]
    }

    const insights: Insight[] = []

    if (stats.safeDaily !== null) {
        insights.push(stats.dailyAvg > stats.safeDaily
            ? { id: 'pace-warning', tone: 'warning', text: `Spending faster than planned — ${formatCurrency(stats.dailyAvg)}/day vs a safe ${formatCurrency(stats.safeDaily)}/day.` }
            : { id: 'pace-good', tone: 'positive', text: 'On track — spending is under your safe daily pace.' })
    }

    const topCategory = getTopExpenseCategory(transactions)
    if (topCategory) {
        const pct = Math.round((topCategory.amount / stats.totalExpense) * 100)
        if (pct >= 40) {
            insights.push({ id: 'top-category', tone: 'info', text: `Most of this period's spending is going to ${topCategory.name} (${pct}%).` })
        }
    }

    if (stats.noSpendDays > 0) {
        insights.push({ id: 'no-spend-days', tone: 'positive', text: `${stats.noSpendDays} no-spend day${stats.noSpendDays !== 1 ? 's' : ''} so far this period.` })
    }

    const expenses = transactions.filter(t => t.type === 'expense')
    const biggest = expenses.reduce<TransactionWithDetails | null>(
        (mx, tx) => (!mx || tx.amount > mx.amount ? tx : mx), null
    )
    if (biggest) {
        const pct = Math.round((biggest.amount / stats.totalExpense) * 100)
        if (pct >= 15) {
            insights.push({ id: 'biggest-expense', tone: 'neutral', text: `Your biggest single expense was ${formatCurrency(biggest.amount)} on ${biggest.category?.name ?? 'an expense'} (${pct}% of spending).` })
        }
    }

    const weekdayTotals = groupExpensesByWeekday(expenses)
    const weekdaySum = weekdayTotals.reduce((s, d) => s + d.total, 0)
    if (weekdaySum > 0) {
        const topWeekday = weekdayTotals.reduce((mx, d) => (d.total > mx.total ? d : mx), weekdayTotals[0])
        const pct = Math.round((topWeekday.total / weekdaySum) * 100)
        if (pct >= 30) {
            insights.push({ id: 'weekday-pattern', tone: 'neutral', text: `You tend to spend most on ${topWeekday.day}s — ${pct}% of this period's expenses.` })
        }
    }

    if (stats.totalIncome > 0) {
        // Savings transactions aren't spending, so they count toward the rate, not against it.
        const unspent = stats.totalIncome - stats.totalSpending
        const savingsRate = Math.round((unspent / stats.totalIncome) * 100)
        insights.push(unspent < 0
            ? { id: 'overspent', tone: 'warning', text: `You've overspent this period by ${formatCurrency(Math.abs(unspent))}.` }
            : { id: 'savings-rate', tone: savingsRate >= 20 ? 'positive' : 'neutral', text: `${savingsRate}% of income unspent so far this period.` })
    }

    if (insights.length === 0) {
        insights.push({ id: 'fallback', tone: 'neutral', text: 'Keep logging transactions to see how this period is trending.' })
    }

    return insights.slice(0, 4)
}

export function PeriodInsights({ transactions, stats }: { transactions: TransactionWithDetails[]; stats: PeriodStats }) {
    const insights = useMemo(() => generateInsights(transactions, stats), [transactions, stats])

    return (
        <div className="rounded-[20px] border border-[#e5e5e5] bg-white px-5 py-4 space-y-2.5">
            {insights.map(insight => (
                <p key={insight.id} className={cn('border-l-2 pl-3 text-[13px] leading-relaxed', TONE_CLASSES[insight.tone])}>
                    {insight.text}
                </p>
            ))}
        </div>
    )
}
