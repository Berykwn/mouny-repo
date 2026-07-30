import { Account, DebtWithAccount, TransactionWithDetails } from "."

export interface TrendPoint {
    label: string
    income: number
    expense: number
}

export interface OverviewData {
    totalIncome: number
    totalExpense: number
    transactions: TransactionWithDetails[]
    prevTransactions: TransactionWithDetails[]
    debts: DebtWithAccount[]
    accounts: Account[]
    trendPeriods: TrendPoint[]
    closingBalance: number | null
    prevClosingBalance: number | null
}