import type { RecurringBill, TransactionWithDetails } from '@/types'
import { isRunning } from './bills'

/**
 * A bill's payments over the periods that have loaded, from the transactions that point
 * at it. Nothing here is estimated: a price change is only ever two real payments apart.
 */

export interface BillPayment {
    id: string
    date: string
    amount: number
    account: string | null
}

/** Every bill's payments, oldest first, keyed by bill id. */
export function paymentsByBill(transactionLists: TransactionWithDetails[][]): Map<string, BillPayment[]> {
    const seen = new Set<string>()
    const byBill = new Map<string, BillPayment[]>()
    for (const list of transactionLists) {
        for (const t of list) {
            if (!t.recurring_bill_id || t.type !== 'expense' || seen.has(t.id)) continue
            seen.add(t.id)
            const payments = byBill.get(t.recurring_bill_id) ?? []
            payments.push({ id: t.id, date: t.date.slice(0, 10), amount: t.amount, account: t.account?.name ?? null })
            byBill.set(t.recurring_bill_id, payments)
        }
    }
    for (const payments of byBill.values()) payments.sort((a, b) => a.date.localeCompare(b.date))
    return byBill
}

export interface PriceChange {
    from: number
    to: number
    /** Rounded, signed: 20 for a 20% rise. */
    percent: number
    /** When the new price was first paid. */
    since: string
}

/** The latest payment against the one before it; null with fewer than two or no change. */
export function lastPriceChange(payments: BillPayment[]): PriceChange | null {
    if (payments.length < 2) return null
    const to = payments[payments.length - 1]
    const from = payments[payments.length - 2]
    if (from.amount <= 0 || Math.round(to.amount) === Math.round(from.amount)) return null
    // The new price started at the first payment at it, which may be a few back.
    let since = to.date
    for (let i = payments.length - 1; i >= 0 && Math.round(payments[i].amount) === Math.round(to.amount); i--) since = payments[i].date
    return { from: from.amount, to: to.amount, percent: Math.round(((to.amount - from.amount) / from.amount) * 100), since }
}

export interface SubscriptionAudit {
    /** Running subscriptions over a year. */
    perYear: number
    /** The running subscription whose price rose most at its last payment. */
    rise: { bill: RecurringBill; change: PriceChange } | null
    /** Paused subscriptions, with their last payment when there is one. */
    paused: { bill: RecurringBill; lastPaid: string | null }[]
}

/**
 * What's worth saying about subscriptions: a price that went up and ones left paused.
 * Null when there's nothing to say, so the page stays quiet.
 */
export function subscriptionAudit(bills: RecurringBill[], payments: Map<string, BillPayment[]>, today: string): SubscriptionAudit | null {
    const subs = bills.filter(b => b.kind === 'subscription')
    let rise: SubscriptionAudit['rise'] = null
    for (const bill of subs.filter(b => isRunning(b, today))) {
        const change = lastPriceChange(payments.get(bill.id) ?? [])
        // Once the bill is set to the new price, the rise has been dealt with.
        if (change && Math.round(bill.amount) >= Math.round(change.to)) continue
        if (change && change.percent > 0 &&(!rise || change.percent > rise.change.percent)) rise = { bill, change }
    }
    const paused = subs
        .filter(b => b.paused && (!b.ends_on || b.ends_on >= today))
        .map(bill => ({ bill, lastPaid: payments.get(bill.id)?.at(-1)?.date ?? null }))
    if (!rise && paused.length === 0) return null
    const perYear = subs
        .filter(b => isRunning(b, today))
        .reduce((s, b) => s + (b.frequency === 'yearly' ? b.amount : b.amount * 12), 0)
    return { perYear, rise, paused }
}

/** The latest payment, which the pay sheet compares the bill's usual amount with. */
export function lastPayment(payments: BillPayment[] | undefined): BillPayment | null {
    return payments?.at(-1) ?? null
}
