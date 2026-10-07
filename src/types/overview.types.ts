import { Account, PayPeriod, TransactionWithDetails } from "."
import type { PeriodSummary } from "@/lib/period-summary"

export interface OverviewData {
    transactions: TransactionWithDetails[]
    accounts: Account[]
    closingBalance: number | null
    period: PayPeriod
    fallbackTotalDays: number | null
    allPeriods: PayPeriod[]
    previousSummary: PeriodSummary | null
    totalBalance: number
    /** Null until debts have loaded. */
    totalDebt: number | null
}
