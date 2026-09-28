import { Account, PayPeriod, TransactionWithDetails } from "."

export interface OverviewData {
    totalIncome: number
    totalExpense: number
    transactions: TransactionWithDetails[]
    accounts: Account[]
    closingBalance: number | null
    period: PayPeriod
    fallbackTotalDays: number | null
    allPeriods: PayPeriod[]
    previousSummary: { income: number; expense: number; net: number } | null
    totalBalance: number
    totalDebt: number
}
