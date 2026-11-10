import { availableToSpend, roleOf } from '@/lib/account-roles'
import { formatCurrency } from '@/lib/helpers'
import type { Account } from '@/types'

/**
 * An amount bigger than what an account shows. The database still refuses it (no new
 * overdrafts on everyday accounts), but the form doesn't stop there: more often than not
 * the record is behind (a top-up or withdrawal that wasn't written down), so it offers
 * the two ways forward — move the money in, or count what's really there.
 */

/** Top-ups are offered in round steps of this much, like the Accounts page's. */
export const TOP_UP_STEP = 50_000

/**
 * What to move in to cover `short`: rounded up to the next step, never more than the
 * source holds. Null when the source can't cover even the shortfall itself, or nothing's
 * short.
 */
export function roundedTopUp(short: number, sourceBalance: number): number | null {
    if (short <= 0 || sourceBalance < short) return null
    return Math.min(Math.ceil(short / TOP_UP_STEP) * TOP_UP_STEP, sourceBalance)
}

/**
 * Where a top-up comes from: the fullest everyday account other than `exceptIds`. Not
 * savings (spending it isn't what it's for) and not a card (that would be borrowing).
 */
export function topUpSource<T extends Account>(accounts: T[], exceptIds: string[]): T | null {
    return accounts
        .filter(a => !exceptIds.includes(a.id) && roleOf(a) === 'everyday' && a.balance > 0)
        .sort((a, b) => b.balance - a.balance)[0] ?? null
}

export interface Shortfall<T extends Account = Account> {
    account: T
    /** What the account can give, as the form sees it (see `heldBack`). */
    available: number
    /** How much more the amount is than that. */
    short: number
    /** Where a top-up would come from; null when no account can cover it. */
    source: T | null
    /** The top-up the button offers; null with no source. */
    topUp: number | null
}

interface ShortfallOptions {
    /** Other accounts a top-up mustn't come from (a transfer's destination). */
    exclude?: string[]
    /**
     * Money this same entry already took out of the account (an expense being edited):
     * it comes back before the new amount leaves, so it counts as available.
     */
    heldBack?: number
}

/** Null when the account can give `amount`. */
export function shortfallFor<T extends Account>(
    account: T,
    amount: number,
    accounts: T[],
    { exclude = [], heldBack = 0 }: ShortfallOptions = {},
): Shortfall<T> | null {
    const available = availableToSpend(account) + heldBack
    if (!(amount > 0) || amount <= available) return null
    const short = amount - available
    const candidate = topUpSource(accounts, [account.id, ...exclude])
    const topUp = candidate ? roundedTopUp(short, candidate.balance) : null
    return { account, available, short, source: topUp ? candidate : null, topUp }
}

/** "Cash shows Rp 181.000 — probably a top-up you didn't note." */
export function shortfallLine(s: Pick<Shortfall, 'account' | 'available'>): string {
    const { account } = s
    if (roleOf(account) === 'credit') {
        return `${account.name} has ${formatCurrency(Math.max(0, s.available))} left on its limit — probably a payment you didn’t note.`
    }
    return `${account.name} shows ${formatCurrency(s.available)} — probably a top-up you didn’t note.`
}
