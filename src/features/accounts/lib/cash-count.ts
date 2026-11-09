import type { Account, CountAs } from '@/types'

/**
 * A cash count: the user types what's actually in each account, and each difference is
 * recorded one of three ways (see 20261109000200_cash_count.sql).
 */
export type { CountAs }

export interface CountLine {
    account: Account
    /** What the user typed: the balance, or for a credit account what's owed. Empty: not counted. */
    typed: string
    as: CountAs
}

/**
 * The balance a typed amount means. A credit account is counted the way its app shows it,
 * as what's owed, so 1.200.000 typed is a balance of -1.200.000.
 */
export function actualBalance(account: Pick<Account, 'role'>, typed: number): number {
    return account.role === 'credit' ? -typed : typed
}

/** What the account shows today, in the same terms as what's typed. */
export function recordedFigure(account: Pick<Account, 'role' | 'balance'>): number {
    return account.role === 'credit' ? Math.max(0, -account.balance) : account.balance
}

/**
 * Less than recorded is most often spending nobody wrote down; more than recorded is more
 * often a slip than forgotten income. The user can change either before saving.
 */
export function suggestedAs(diff: number): CountAs {
    return diff < 0 ? 'spending' : 'correction'
}

/** The choices that fit a difference: spending only when there's less, income only when more. */
export function choicesFor(diff: number): CountAs[] {
    return diff < 0 ? ['spending', 'correction'] : ['income', 'correction']
}

export const COUNT_AS_LABEL: Record<CountAs, string> = {
    spending: 'Unrecorded spending',
    income: 'Unrecorded income',
    correction: 'Correction',
}

export const COUNT_AS_HINT: Record<CountAs, string> = {
    spending: 'Counts in your spending, as “Unrecorded”.',
    income: 'Counts as income, as “Unrecorded”.',
    correction: 'Fixes the balance only; not spending or income.',
}
