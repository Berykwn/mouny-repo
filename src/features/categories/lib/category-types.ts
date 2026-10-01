import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'
import type { CategoryType } from '@/types'

export const categoryTypeConfig: Record<CategoryType, {
    label: string
    sub: string
    icon: LucideIcon
    tone: 'positive' | 'negative'
}> = {
    expense: {
        label: 'Expense',
        sub: 'Food, transport...',
        icon: TrendingDown,
        tone: 'negative',
    },
    income: {
        label: 'Income',
        sub: 'Salary, freelance...',
        icon: TrendingUp,
        tone: 'positive',
    },
}
