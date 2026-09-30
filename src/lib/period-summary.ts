export interface PeriodSummary {
    income: number
    /** Every expense, savings included — what actually left the accounts. */
    expense: number
    /** Expenses in savings categories: set aside, not spent. */
    savings: number
    /** Expenses minus savings. */
    spending: number
    /** Income minus every expense — cash left in the accounts. */
    net: number
    /**
     * Income minus spending — the savings-rate base. Counts leftover money the same
     * as savings transactions, since the app can't see transfers out to a savings
     * account; it's money not spent, not proof it was set aside.
     */
    unspent: number
}

export const EMPTY_PERIOD_SUMMARY: PeriodSummary = { income: 0, expense: 0, savings: 0, spending: 0, net: 0, unspent: 0 }

type SummaryRow = { type: string; amount: number; category?: { is_savings: boolean } | null }

export function summarizeTransactions(rows: SummaryRow[]): PeriodSummary {
    let income = 0
    let expense = 0
    let savings = 0
    for (const t of rows) {
        if (t.type === 'income') income += t.amount
        else if (t.type === 'expense') {
            expense += t.amount
            if (t.category?.is_savings) savings += t.amount
        }
    }
    const spending = expense - savings
    return { income, expense, savings, spending, net: income - expense, unspent: income - spending }
}

/** Unspent share of a base (income or salary), or null when there's no base to divide by. */
export function unspentPct(unspent: number, base: number | null | undefined): number | null {
    return base && base > 0 ? Math.round((unspent / base) * 100) : null
}
