import { resolveCategoryKind } from './category-kind'

/**
 * Telling everyday spending (coffee, lunch, groceries) apart from one-offs (rent, bills,
 * installments, a laptop repair). Pace-based numbers — daily average, projections, runway —
 * extrapolate only the everyday part; one-offs are counted once, as they're paid. Otherwise
 * paying rent on day 2 reads as "spending the rent every day" and the projection explodes.
 */

/** A single expense at least this share of the period's income is a one-off too. */
const ONE_OFF_INCOME_SHARE = 0.1

type PaceTx = {
    type: string
    amount: number
    category?: { name?: string | null; is_savings?: boolean | null; kind?: string | null } | null
}

export function isOneOff(tx: PaceTx, periodIncome: number): boolean {
    if (tx.type !== 'expense') return false
    // Bills are the category's kind; categories saved before kinds existed are guessed by name.
    if (tx.category && resolveCategoryKind(tx.category) === 'fixed') return true
    return periodIncome > 0 && tx.amount >= periodIncome * ONE_OFF_INCOME_SHARE
}

/** Expenses that set a daily pace: not savings, not one-offs. */
export function isEverydaySpending(tx: PaceTx, periodIncome: number): boolean {
    return tx.type === 'expense' && !tx.category?.is_savings && !isOneOff(tx, periodIncome)
}
