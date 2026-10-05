/**
 * Transfers, money lent or borrowed, collections and balance adjustments only change
 * hands: they move a balance but aren't income or spending, so every total that counts
 * `income` and `expense` leaves them out by itself.
 */
export function isTransfer(type: string): boolean {
    return type === 'transfer_in' || type === 'transfer_out'
}

/** Money coming into the account. */
export function isInflow(type: string): boolean {
    return type === 'income' || type === 'transfer_in'
}

/** The sign shown before an amount. */
export function amountSign(type: string): '+' | '−' {
    return isInflow(type) ? '+' : '−'
}

/** Earned money is green, spent money is ink, money changing hands is muted. */
export function amountColor(type: string): string {
    if (isTransfer(type)) return 'text-muted-ink'
    return type === 'income' ? 'text-positive' : 'text-ink'
}
