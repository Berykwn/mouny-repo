import { useMemo } from 'react'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { TransactionWithDetails } from '@/types'

interface PeriodInsightProps {
    transactions: TransactionWithDetails[]
    totalExpense: number
    dailyAvg: number
    safeDaily: number | null
}

type Tone = 'warning' | 'positive' | 'info' | 'neutral'

const TONE_CLASSES: Record<Tone, string> = {
    warning: 'border-[#dc2626] text-[#dc2626]',
    positive: 'border-[#6FA82B] text-[#4d7a1d]',
    info: 'border-[#8a8a84] text-[#5b5b55]',
    neutral: 'border-[#e5e5e5] text-[#8a8a84]',
}

export function PeriodInsight({ transactions, totalExpense, dailyAvg, safeDaily }: PeriodInsightProps) {
    const insight = useMemo<{ tone: Tone; text: string }>(() => {
        if (totalExpense <= 0) {
            return { tone: 'neutral', text: 'No spending recorded yet this period.' }
        }

        if (safeDaily !== null && dailyAvg > safeDaily) {
            return {
                tone: 'warning',
                text: `Spending faster than planned — ${formatCurrency(dailyAvg)}/day vs a safe ${formatCurrency(safeDaily)}/day.`,
            }
        }

        const byCategory = new Map<string, { name: string; amount: number }>()
        for (const tx of transactions) {
            if (tx.type !== 'expense' || !tx.category) continue
            const entry = byCategory.get(tx.category.id)
            if (entry) entry.amount += tx.amount
            else byCategory.set(tx.category.id, { name: tx.category.name, amount: tx.amount })
        }
        const topCategory = Array.from(byCategory.values()).reduce<{ name: string; amount: number } | null>(
            (best, c) => (!best || c.amount > best.amount ? c : best), null
        )

        if (topCategory && topCategory.amount / totalExpense >= 0.4) {
            const pct = Math.round((topCategory.amount / totalExpense) * 100)
            return { tone: 'info', text: `Most of this period's spending is going to ${topCategory.name} (${pct}%).` }
        }

        if (safeDaily !== null) {
            return { tone: 'positive', text: 'On track — spending is under your safe daily pace.' }
        }

        return { tone: 'neutral', text: 'Keep logging transactions to see how this period is trending.' }
    }, [transactions, totalExpense, dailyAvg, safeDaily])

    return (
        <div className="rounded-[20px] border border-[#e5e5e5] bg-white px-5 py-4">
            <p className={cn('border-l-2 pl-3 text-[13px] leading-relaxed', TONE_CLASSES[insight.tone])}>
                {insight.text}
            </p>
        </div>
    )
}
