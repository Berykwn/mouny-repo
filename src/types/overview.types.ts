import { WishListAnalysis } from "@/services/wish-list.service"
import { Account, DebtWithAccount, TransactionWithDetails, WishListItem } from "."

export interface TrendPoint {
    label: string
    income: number
    expense: number
}

export interface OverviewData {
    totalIncome: number
    totalExpense: number
    salaryAmount: number
    startDate: string
    transactions: TransactionWithDetails[]
    prevTransactions: TransactionWithDetails[]
    debts: DebtWithAccount[]
    wishItems: WishListItem[]
    wishAnalysis: Record<string, WishListAnalysis>
    accounts: Account[]
    trendPeriods: TrendPoint[]
    closingBalance: number | null
    prevClosingBalance: number | null
}