import { formatCurrency, getDaysBetween } from '@/lib/helpers'
import { MIN_PROJECTION_DAYS, type PeriodStats } from '@/hooks/use-period-stats'
import { isRunning, overdueBills, type BillDue } from '@/features/bills/lib/bills'
import { shortBeforePayday, type CashOutlook } from './cash-outlook'
import { shortDate } from '@/features/bills/lib/bill-labels'
import { availableToSpend, isCredit, isSpendable, overdrawnBy } from '@/lib/account-roles'
import type { Account, CategoryBudget, Debt, RecurringBill, TransactionWithDetails } from '@/types'

// ─── Hero ────────────────────────────────────────────────────────────────────

export type HeroStatus = 'on-track' | 'tight' | 'overdue' | 'short' | 'over' | 'closed'

export const HERO_STATUS_LABEL: Record<HeroStatus, string> = {
    'on-track': 'On track',
    tight: 'Tight',
    overdue: 'Bills overdue',
    short: 'Runs short',
    over: 'Over',
    closed: 'Closed',
}

/** What else Home knows that the period's own numbers don't: the cash-flow line and late bills. */
export interface HeroSignals {
    /** The first day the everyday money dips below zero before payday (shortBeforePayday); null when it holds. */
    shortOn?: string | null
    /** Unpaid bills past their due date. */
    overdueCount?: number
}

export interface HeroNumbers {
    status: HeroStatus
    /** What can go today; for a closed period (or one with no end yet) what's left of the period. */
    today: number
    /** Days the remaining money has to cover, today included; null when the end isn't known. */
    daysLeft: number | null
    /** Share of income already spent, saved or held for bills, 0 to 1. */
    used: number
    /** How far into the period today is, 0 to 1; null when the end isn't known or it's closed. */
    elapsed: number | null
    /**
     * The end was only estimated (from the last period's length) and today has reached it:
     * a daily number would be a guess, so the hero asks to close the period instead.
     */
    pastPayday: boolean
}

/**
 * The calm headline: one number, one word. "Over" once the money's gone; "Runs short" when
 * the cash-flow line dips below zero before payday; "Bills overdue" while a bill is late;
 * "Tight" only once there's enough of a pace to judge (a day or two is one purchase, not a
 * habit). "On track" only when none of those hold, so Home never contradicts Insights.
 */
export function heroNumbers(stats: PeriodStats, { shortOn = null, overdueCount = 0 }: HeroSignals = {}): HeroNumbers {
    const used = stats.totalIncome > 0
        ? Math.min(1, Math.max(0, (stats.totalIncome - stats.remaining) / stats.totalIncome))
        : stats.remaining < 0 ? 1 : 0

    if (stats.isClosed) return { status: 'closed', today: stats.remaining, daysLeft: null, used, elapsed: null, pastPayday: false }

    const daysLeft = stats.daysRemaining !== null ? stats.daysRemaining + 1 : null
    const elapsed = stats.totalDays ? Math.min(1, stats.daysElapsed / stats.totalDays) : null
    const status: HeroStatus = stats.remaining < 0 ? 'over'
        : shortOn ? 'short'
            : overdueCount > 0 ? 'overdue'
                : stats.daysElapsed >= MIN_PROJECTION_DAYS && stats.safeDaily !== null && stats.dailyAvg > stats.safeDaily ? 'tight'
                    : 'on-track'
    const pastPayday = stats.isEndDateEstimated && stats.daysRemaining === 0
    return { status, today: stats.safeDaily ?? stats.remaining, daysLeft, used, elapsed, pastPayday }
}

// ─── Smart line ──────────────────────────────────────────────────────────────

export type SmartLineKind = 'cash-short' | 'bills-overdue' | 'bill-changed' | 'receivable-overdue' | 'budget-low' | 'account-short'

export interface SmartLine {
    kind: SmartLineKind
    /**
     * Changes when the situation does (another bill, a budget gone from low to over), not
     * with every entry, so a "Not now" holds but doesn't hide a new one.
     */
    key: string
    /** Parts, with the amount that matters marked to stand out. */
    parts: { text: string; strong?: boolean }[]
    action: { label: string; to: string }
}

export interface SmartLineInput {
    today: string
    bills: RecurringBill[]
    /** This period's transactions and the last one's: where the latest bill payments are. */
    recentTransactions: TransactionWithDetails[]
    debts: Pick<Debt, 'id' | 'type' | 'status' | 'counterparty' | 'remaining_amount' | 'due_date'>[]
    budgets: Pick<CategoryBudget, 'category_id' | 'amount'>[]
    /** This period's transactions. */
    transactions: TransactionWithDetails[]
    /** Days left in the period, today included; null when the end isn't known. */
    daysLeft: number | null
    accounts: Pick<Account, 'id' | 'name' | 'balance' | 'is_savings' | 'role' | 'credit_limit'>[]
    dues: BillDue[]
    /** The cash-flow line Insights draws; null until bills and debts load. */
    outlook?: Pick<CashOutlook, 'points'> | null
}

const names = (list: string[]) =>
    list.length <= 1 ? list[0] ?? '' : list.length === 2 ? `${list[0]} and ${list[1]}` : `${list[0]} and ${list.length - 1} more`

/** The cash-flow line dips below zero before payday: the same day Insights names. */
function cashShort({ outlook, dues, today }: SmartLineInput): SmartLine | null {
    const short = shortBeforePayday(outlook)
    if (!short) return null
    const late = overdueBills(dues, today)
    return {
        kind: 'cash-short',
        key: `cash-short:${short.date}`,
        parts: [
            { text: 'Your everyday money dips below zero around ' },
            { text: shortDate(short.date), strong: true },
            { text: ', before payday.' },
            ...(late.length > 0 ? [{ text: ` ${names(late.map(d => d.bill.name))} ${late.length === 1 ? 'is' : 'are'} already overdue.` }] : []),
        ],
        action: { label: 'See cash flow', to: '/insights?tab=cash-flow' },
    }
}

/** Unpaid bills past their due date. */
function billsOverdue({ dues, today }: SmartLineInput): SmartLine | null {
    const late = overdueBills(dues, today)
    if (late.length === 0) return null
    const total = late.reduce((s, d) => s + d.reserved, 0)
    return {
        kind: 'bills-overdue',
        key: `bills-overdue:${late.map(d => `${d.bill.id}@${d.nextDue}`).join(',')}`,
        parts: [
            { text: `${names(late.map(d => d.bill.name))} ${late.length === 1 ? 'is' : 'are'} overdue: ` },
            { text: formatCurrency(total), strong: true },
            { text: late.length === 1 ? '.' : ' in all.' },
        ],
        action: { label: 'Open bills', to: '/bills' },
    }
}

/** A charge this far from the bill's amount is a real change, not rounding. */
const BILL_CHANGE_MIN = 1_000
/**
 * Electricity or water moves a little every month; only this share off the bill counts
 * as a change worth a line.
 */
const BILL_CHANGE_SHARE = 0.1
/** A budget this used up is "running low". */
const BUDGET_LOW_SHARE = 0.8

/** Two amounts far enough apart to call a change: at least 10% (and Rp 1.000) of the first. */
const differs = (base: number, amount: number) =>
    Math.abs(amount - base) >= Math.max(BILL_CHANGE_MIN, base * BILL_CHANGE_SHARE)

/**
 * The latest payment of a running bill that didn't match what the bill says. When there's
 * a payment before it too, both must agree on the new amount: one high electricity month
 * is a month, two in a row is the bill.
 */
function billChanged({ today, bills, recentTransactions }: SmartLineInput): SmartLine | null {
    let found: { bill: RecurringBill; tx: TransactionWithDetails } | null = null
    for (const bill of bills) {
        if (!isRunning(bill, today)) continue
        const [latest, before] = recentTransactions
            .filter(t => t.recurring_bill_id === bill.id && t.type === 'expense')
            .sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))
        if (!latest || !differs(bill.amount, latest.amount)) continue
        if (before && differs(latest.amount, before.amount)) continue
        if (!found || latest.date > found.tx.date) found = { bill, tx: latest }
    }
    if (!found) return null
    const { bill, tx } = found
    return {
        kind: 'bill-changed',
        key: `bill-changed:${bill.id}:${tx.id}:${bill.amount}`,
        parts: [
            { text: `${bill.name} was paid ` },
            { text: formatCurrency(tx.amount), strong: true },
            { text: ` on ${shortDate(tx.date)}. Your bill says ${formatCurrency(bill.amount)}.` },
        ],
        action: { label: 'Review bill', to: '/bills' },
    }
}

/** The receivable longest past its due date. */
function receivableOverdue({ today, debts }: SmartLineInput): SmartLine | null {
    const overdue = debts
        .filter(d => d.type === 'receivable' && d.status === 'active' && d.remaining_amount > 0 && d.due_date && d.due_date < today)
        .sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0]
    if (!overdue) return null
    return {
        kind: 'receivable-overdue',
        key: `receivable:${overdue.id}:${overdue.due_date}`,
        parts: [
            { text: `${overdue.counterparty} still owes you ` },
            { text: formatCurrency(overdue.remaining_amount), strong: true },
            { text: `, due ${shortDate(overdue.due_date!)}.` },
        ],
        action: { label: 'Open debts', to: '/debts' },
    }
}

/** The budget most used up, once it's at least 80% gone. */
function budgetLow({ budgets, transactions, daysLeft }: SmartLineInput): SmartLine | null {
    const spent = new Map<string, { name: string; amount: number }>()
    for (const t of transactions) {
        if (t.type !== 'expense' || !t.category_id) continue
        const entry = spent.get(t.category_id) ?? { name: t.category?.name ?? 'A category', amount: 0 }
        entry.amount += t.amount
        spent.set(t.category_id, entry)
    }
    const low = budgets
        .filter(b => b.amount > 0 && spent.has(b.category_id))
        .map(b => ({ budget: b.amount, ...spent.get(b.category_id)!, id: b.category_id }))
        .map(b => ({ ...b, ratio: b.amount / b.budget }))
        .filter(b => b.ratio >= BUDGET_LOW_SHARE)
        .sort((a, b) => b.ratio - a.ratio)[0]
    if (!low) return null
    // By category and band only: a "Not now" holds as spending goes on, until the budget tips over.
    const key = `budget:${low.id}:${low.amount > low.budget ? 'over' : 'low'}`
    const action = { label: 'Open budgets', to: '/category' }
    if (low.amount > low.budget) {
        return {
            kind: 'budget-low',
            key,
            parts: [
                { text: `${low.name} is ` },
                { text: formatCurrency(low.amount - low.budget), strong: true },
                { text: ` over its ${formatCurrency(low.budget)} budget.` },
            ],
            action,
        }
    }
    const togo = daysLeft !== null && daysLeft > 0 ? `, with ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go` : ''
    return {
        kind: 'budget-low',
        key,
        parts: [
            { text: `${low.name} has ` },
            { text: formatCurrency(low.budget - low.amount), strong: true },
            { text: ` left of its ${formatCurrency(low.budget)} budget${togo}.` },
        ],
        action,
    }
}

// The one rule for "past what it can hold", shared with the Accounts page.
export { overdrawnBy }

/**
 * A spendable account past what it can hold, or with less left than the bills set to be
 * paid from it. Savings aren't spent from, so they're left alone.
 */
function accountShort({ accounts, dues }: SmartLineInput): SmartLine | null {
    const action = { label: 'Open accounts', to: '/accounts' }
    const spendable = accounts.filter(isSpendable)
    const over = spendable
        .map(account => ({ account, by: overdrawnBy(account) }))
        .filter(x => x.by > 0)
        .sort((a, b) => b.by - a.by)[0]
    if (over) {
        return {
            kind: 'account-short',
            key: `account-negative:${over.account.id}`,
            parts: [
                { text: `${over.account.name} is ` },
                { text: formatCurrency(over.by), strong: true },
                { text: isCredit(over.account) ? ' over its limit.' : ' below zero.' },
            ],
            action,
        }
    }
    const short = spendable
        .map(a => ({
            account: a,
            // A card can be charged down to its limit; one without a limit is never short.
            available: availableToSpend(a),
            due: dues.filter(d => d.bill.account_id === a.id && d.outstanding > 0).reduce((s, d) => s + d.reserved, 0),
        }))
        .filter(x => x.due > 0 && x.available < x.due)
        .sort((a, b) => (a.available - a.due) - (b.available - b.due))[0]
    if (!short) return null
    const has = isCredit(short.account)
        ? `${short.account.name} has ${formatCurrency(short.available)} left of its limit, but `
        : `${short.account.name} has ${formatCurrency(short.available)}, but `
    return {
        kind: 'account-short',
        key: `account-short:${short.account.id}`,
        parts: [
            { text: has },
            { text: formatCurrency(short.due), strong: true },
            { text: ' in bills is due from it before payday.' },
        ],
        action,
    }
}

/**
 * At most one line worth acting on, first by priority: money running out before payday (the
 * cash-flow forecast), bills already overdue, a bill that charged a different amount, money
 * owed to you that's overdue, a budget running low, an account that can't cover what's due
 * from it. Null when nothing applies — Home says nothing then.
 */
export function pickSmartLine(input: SmartLineInput): SmartLine | null {
    return cashShort(input) ?? billsOverdue(input) ?? billChanged(input) ?? receivableOverdue(input) ?? budgetLow(input) ?? accountShort(input)
}

// ─── No entries ──────────────────────────────────────────────────────────────

/** After this many days without an entry, the balances have likely drifted from the wallet. */
export const QUIET_DAYS = 3

/**
 * Whole days since the last entry in the period (or since it started, without one), when
 * that's QUIET_DAYS or more; null otherwise. Entries dated in the future don't count.
 */
export function daysWithoutEntries(transactions: Pick<TransactionWithDetails, 'date'>[], periodStart: string, today: string): number | null {
    let last: string | null = null
    for (const t of transactions) {
        const date = t.date.slice(0, 10)
        if (date <= today && (!last || date > last)) last = date
    }
    const days = getDaysBetween(last ?? periodStart, today)
    return days >= QUIET_DAYS ? days : null
}
