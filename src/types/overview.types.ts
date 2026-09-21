import { Account, PayPeriod, TransactionWithDetails } from "."

export interface TrendPoint {
    label: string
    income: number
    expense: number
}

export interface OverviewData {
    totalIncome: number
    totalExpense: number
    transactions: TransactionWithDetails[]
    accounts: Account[]
    closingBalance: number | null
    period: Pick<PayPeriod, 'start_date' | 'end_date'>
    fallbackTotalDays: number | null
}
