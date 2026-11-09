import type { Account } from '@/types'
import { availableToSpend, isCredit } from '@/lib/account-roles'
import { formatCurrency } from '@/lib/helpers'

type SpendSource = Pick<Account, 'name' | 'balance' | 'role' | 'credit_limit'>

/**
 * The line under an account's name in a picker: its balance, or for a credit account
 * what can still be spent on it. A card's balance is mostly negative (what's owed),
 * which read as "overdrawn" where the user is choosing what to pay with.
 */
export function accountSubline(account: SpendSource): string {
    if (!isCredit(account)) return formatCurrency(account.balance ?? 0)
    if (account.credit_limit == null) return 'No limit'
    return `${formatCurrency(Math.max(0, availableToSpend(account)))} available`
}

/** Why `amount` can't leave the account, or null when it can. */
export function overspendMessage(account: SpendSource, amount: number): string | null {
    if (amount <= availableToSpend(account)) return null
    return isCredit(account)
        ? `That goes over the credit limit of ${account.name}.`
        : `Insufficient balance in ${account.name}.`
}

/** A save's error, named after the account when it's about the money running out. */
export function spendErrorMessage(error: string, account: Pick<Account, 'name'> | null | undefined): string {
    const name = account?.name ?? 'that account'
    if (/credit limit/i.test(error)) return `That goes over the credit limit of ${name}.`
    if (/insufficient|balance/i.test(error)) return `Insufficient balance in ${name}.`
    return error
}
