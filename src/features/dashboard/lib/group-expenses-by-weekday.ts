import type { TransactionWithDetails } from '@/types'

export interface WeekdayTotal {
    day: string
    total: number
}

const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Expense transactions summed per weekday (Mon-Sun), in fixed weekday order. */
export function groupExpensesByWeekday(expenses: TransactionWithDetails[]): WeekdayTotal[] {
    const totals = new Array(7).fill(0) as number[]
    for (const tx of expenses) {
        const jsDay = new Date(tx.date + 'T00:00:00').getDay() // 0 = Sunday
        totals[(jsDay + 6) % 7] += tx.amount
    }
    return LABELS.map((day, i) => ({ day, total: totals[i] }))
}
