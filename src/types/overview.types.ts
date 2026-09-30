import { Account, PayPeriod, TransactionWithDetails } from "."
import type { PeriodSummary } from "@/lib/period-summary"

export interface OverviewData {
    totalIncome: number
    totalExpense: number
    transactions: TransactionWithDetails[]
    accounts: Account[]
    closingBalance: number | null
    period: PayPeriod
    fallbackTotalDays: number | null
    allPeriods: PayPeriod[]
    previousSummary: PeriodSummary | null
    totalBalance: number
    totalDebt: number
}
