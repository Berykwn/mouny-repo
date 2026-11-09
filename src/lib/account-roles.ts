import type { Account, AccountRole } from '@/types'

/**
 * What an account's money is for. The database keeps `role` and mirrors it into
 * `is_savings` (savings and asset accounts are set aside), so every savings calculation
 * that reads is_savings keeps working; this file is what the app reads instead.
 *
 *   everyday  spent from: bank, cash, e-wallet. Counts as spendable; has a runway.
 *   savings   set aside. Money moved in counts as saved.
 *   asset     held, not spent: gold, funds, deposits. Its value is updated by hand
 *             (a balance adjustment, never income).
 *   credit    a credit card or pay-later line. Spent from like everyday, may go below
 *             zero down to its limit; what's below zero is owed.
 */

type RoleSource = Pick<Account, 'role'> | { role?: string | null }

/** The order pickers and lists group by. */
export const ROLE_ORDER: AccountRole[] = ['everyday', 'credit', 'savings', 'asset']

export const ROLE_LABEL: Record<AccountRole, string> = {
    everyday: 'Everyday',
    credit: 'Credit',
    savings: 'Savings',
    asset: 'Assets',
}

export const ROLE_HINT: Record<AccountRole, string> = {
    everyday: 'Bank, cash or e-wallet you spend from.',
    credit: 'Credit card or pay-later. Can go below zero, down to its limit.',
    savings: 'Set aside. Money moved in counts as saved, not spendable.',
    asset: 'Gold, funds, deposits. Not spent from; update its value by hand.',
}

/** The account's role, for rows written before roles existed too. */
export function roleOf(account: RoleSource & { is_savings?: boolean | null }): AccountRole {
    const r = account.role
    if (r === 'everyday' || r === 'savings' || r === 'asset' || r === 'credit') return r
    return account.is_savings ? 'savings' : 'everyday'
}

/** Money that can be spent from: everyday and credit accounts. */
export const isSpendable = (account: RoleSource & { is_savings?: boolean | null }) => {
    const r = roleOf(account)
    return r === 'everyday' || r === 'credit'
}

export const isCredit = (account: RoleSource) => account.role === 'credit'
export const isAsset = (account: RoleSource) => account.role === 'asset'

/**
 * How much can still leave the account: the balance, or for a credit account the
 * balance plus its limit (no limit: no bound). Forms check an amount against this.
 */
export function availableToSpend(account: Pick<Account, 'balance' | 'role' | 'credit_limit'>): number {
    if (account.role !== 'credit') return account.balance
    return account.credit_limit == null ? Infinity : account.balance + account.credit_limit
}

/**
 * How far past what it can hold an account is: below zero, or for a credit account below
 * minus its limit (a card below zero is just what's owed on it; one without a limit is
 * never past it). 0 when it isn't.
 */
export function overdrawnBy(account: Pick<Account, 'balance' | 'role' | 'credit_limit'>): number {
    const floor = account.role === 'credit' ? -(account.credit_limit ?? Infinity) : 0
    return account.balance < floor ? floor - account.balance : 0
}

/** What's owed on a credit account (0 when it's at or above zero). */
export const owedOn = (account: Pick<Account, 'balance' | 'role'>) =>
    account.role === 'credit' ? Math.max(0, -account.balance) : 0

/** The user's own order, by position then name. */
export function byPosition<T extends Pick<Account, 'position' | 'name'>>(a: T, b: T): number {
    return (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name)
}

/** Grouped by role (ROLE_ORDER), the user's order inside each group. Empty groups left out. */
export function groupByRole<T extends Account>(accounts: T[]): { role: AccountRole; accounts: T[] }[] {
    return ROLE_ORDER
        .map(role => ({ role, accounts: accounts.filter(a => roleOf(a) === role).sort(byPosition) }))
        .filter(g => g.accounts.length > 0)
}

/** Every account in picker order: grouped by role, the user's order inside each. */
export const pickerOrder = <T extends Account>(accounts: T[]): T[] =>
    groupByRole(accounts).flatMap(g => g.accounts)

/**
 * The account a form starts on: the user's first everyday account, else the first
 * credit account, else the first of any.
 */
export function defaultAccount<T extends Account>(accounts: T[] | null | undefined): T | null {
    if (!accounts || accounts.length === 0) return null
    return pickerOrder(accounts)[0] ?? null
}

export interface BalanceBreakdown {
    /** Everything, credit owed taken off: what you're worth in these accounts. */
    total: number
    /** Everyday balances less what's owed on credit: what spending can use. */
    spendable: number
    saved: number
    assets: number
    /** Owed on credit accounts. */
    owed: number
}

export function balanceBreakdown(accounts: Pick<Account, 'balance' | 'role' | 'is_savings'>[]): BalanceBreakdown {
    const out: BalanceBreakdown = { total: 0, spendable: 0, saved: 0, assets: 0, owed: 0 }
    for (const a of accounts) {
        out.total += a.balance
        switch (roleOf(a)) {
            case 'everyday': out.spendable += a.balance; break
            case 'credit':
                // A card in credit (overpaid) adds to spendable; what's owed comes off it.
                out.spendable += a.balance
                out.owed += Math.max(0, -a.balance)
                break
            case 'savings': out.saved += a.balance; break
            case 'asset': out.assets += a.balance; break
        }
    }
    return out
}
