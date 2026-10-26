import { formatCurrency } from '@/lib/helpers'
import { MIN_PROJECTION_DAYS, type PeriodStats } from '@/hooks/use-period-stats'
import { isRunning, type BillDue } from '@/features/bills/lib/bills'
import { shortDate } from '@/features/bills/lib/bill-labels'
import type { Account, CategoryBudget, Debt, RecurringBill, TransactionWithDetails } from '@/types'

// ─── Hero ────────────────────────────────────────────────────────────────────

export type HeroStatus = 'on-track' | 'tight' | 'over' | 'closed'

export const HERO_STATUS_LABEL: Record<HeroStatus, string> = {
    'on-track': 'On track',
    tight: 'Tight',
    over: 'Over',
    closed: 'Closed',
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
}

/**
 * The calm headline: one number, one word. "Tight" only once there's enough of a pace to
 * judge (a day or two is one purchase, not a habit); "Over" once the money's gone.
 */
export function heroNumbers(stats: PeriodStats): HeroNumbers {
    const used = stats.totalIncome > 0
        ? Math.min(1, Math.max(0, (stats.totalIncome - stats.remaining) / stats.totalIncome))
        : stats.remaining < 0 ? 1 : 0

    if (stats.isClosed) return { status: 'closed', today: stats.remaining, daysLeft: null, used, elapsed: null }

    const daysLeft = stats.daysRemaining !== null ? stats.daysRemaining + 1 : null
    const elapsed = stats.totalDays ? Math.min(1, stats.daysElapsed / stats.totalDays) : null
    const status: HeroStatus = stats.remaining < 0 ? 'over'
        : stats.daysElapsed >= MIN_PROJECTION_DAYS && stats.safeDaily !== null && stats.dailyAvg > stats.safeDaily ? 'tight'
            : 'on-track'
    return { status, today: stats.safeDaily ?? stats.remaining, daysLeft, used, elapsed }
}

// ─── Smart line ──────────────────────────────────────────────────────────────

export type SmartLineKind = 'bill-changed' | 'receivable-overdue' | 'budget-low' | 'account-short'

export interface SmartLine {
    kind: SmartLineKind
    /** Changes when the situation does, so a "Not now" doesn't hide a new one. */
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
    accounts: Pick<Account, 'id' | 'name' | 'balance' | 'is_savings'>[]
    dues: BillDue[]
}

/** A charge this far from the bill's amount is a real change, not rounding. */
const BILL_CHANGE_MIN = 1_000
/** A budget this used up is "running low". */
const BUDGET_LOW_SHARE = 0.8

/** The latest payment of a running bill that didn't match what the bill says. */
function billChanged({ today, bills, recentTransactions }: SmartLineInput): SmartLine | null {
    let found: { bill: RecurringBill; tx: TransactionWithDetails } | null = null
    for (const bill of bills) {
        if (!isRunning(bill, today)) continue
        const latest = recentTransactions
            .filter(t => t.recurring_bill_id === bill.id && t.type === 'expense')
            .sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]
        if (!latest || Math.abs(latest.amount - bill.amount) < BILL_CHANGE_MIN) continue
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
        key: `receivable:${overdue.id}:${overdue.remaining_amount}`,
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
    const key = `budget:${low.id}:${Math.round(low.ratio * 100)}`
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

/** An everyday account below zero, or holding less than the bills set to be paid from it. */
function accountShort({ accounts, dues }: SmartLineInput): SmartLine | null {
    const action = { label: 'Open accounts', to: '/accounts' }
    const spendable = accounts.filter(a => !a.is_savings)
    const negative = spendable.filter(a => a.balance < 0).sort((a, b) => a.balance - b.balance)[0]
    if (negative) {
        return {
            kind: 'account-short',
            key: `account-negative:${negative.id}:${negative.balance}`,
            parts: [
                { text: `${negative.name} is ` },
                { text: formatCurrency(-negative.balance), strong: true },
                { text: ' below zero.' },
            ],
            action,
        }
    }
    const short = spendable
        .map(a => ({
            account: a,
            due: dues.filter(d => d.bill.account_id === a.id && d.outstanding > 0).reduce((s, d) => s + d.reserved, 0),
        }))
        .filter(x => x.due > 0 && x.account.balance < x.due)
        .sort((a, b) => (a.account.balance - a.due) - (b.account.balance - b.due))[0]
    if (!short) return null
    return {
        kind: 'account-short',
        key: `account-short:${short.account.id}:${short.account.balance}:${short.due}`,
        parts: [
            { text: `${short.account.name} has ${formatCurrency(short.account.balance)}, but ` },
            { text: formatCurrency(short.due), strong: true },
            { text: ' in bills is due from it before payday.' },
        ],
        action,
    }
}

/**
 * At most one line worth acting on, first by priority: a bill that charged a different
 * amount, money owed to you that's overdue, a budget running low, an account that can't
 * cover what's due from it. Null when nothing applies — Home says nothing then.
 */
export function pickSmartLine(input: SmartLineInput): SmartLine | null {
    return billChanged(input) ?? receivableOverdue(input) ?? budgetLow(input) ?? accountShort(input)
}
