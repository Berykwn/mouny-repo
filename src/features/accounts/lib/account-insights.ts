import { getDaysBetween } from '@/lib/helpers'
import { isEverydaySpending } from '@/lib/spending-pace'
import { isInflow } from '@/lib/transaction-type'
import type { Account, PayPeriod, TransactionWithDetails } from '@/types'

/** Days of data needed before a spending pace means anything (matches usePeriodStats). */
const MIN_PACE_DAYS = 3

/** An account whose own pace empties it within this many days is flagged as low. */
export const LOW_RUNWAY_DAYS = 7

/** Closed periods shown in the balance trend. */
const TREND_PERIODS = 6

export interface AccountActivity {
    /** Income into this account in the active period. */
    moneyIn: number
    /** Every expense out of it (savings included — the money left the account). */
    moneyOut: number
    /** Recent transactions, newest first. */
    recent: TransactionWithDetails[]
    /** Everyday spending out of it (no savings, bills or one-offs) — what sets its pace. */
    everydayOut: number
}

export type AccountHealth = 'ok' | 'low' | 'overdrawn'

export interface AccountInsight extends AccountActivity {
    /** Days this account's balance lasts at its own outflow pace, or null without a pace. */
    runwayDays: number | null
    health: AccountHealth
}

/** Inclusive days from the period start to today — the pace's denominator. */
export function daysIntoPeriod(period: PayPeriod | null): number {
    return period ? Math.max(1, getDaysBetween(period.start_date) + 1) : 0
}

export function accountInsights(
    accounts: Account[],
    periodTxs: TransactionWithDetails[],
    daysElapsed: number,
): Map<string, AccountInsight> {
    const byAccount = new Map<string, AccountActivity>()
    for (const a of accounts) byAccount.set(a.id, { moneyIn: 0, moneyOut: 0, recent: [], everydayOut: 0 })
    const periodIncome = periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

    const newestFirst = periodTxs.slice().sort((a, b) =>
        b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    for (const t of newestFirst) {
        const act = byAccount.get(t.account_id)
        if (!act) continue
        // Transfers count as money in and out of this account, but not towards its pace.
        if (isInflow(t.type)) act.moneyIn += t.amount
        else {
            act.moneyOut += t.amount
            if (t.type === 'expense' && isEverydaySpending(t, periodIncome)) act.everydayOut += t.amount
        }
        act.recent.push(t)
    }

    const canPace = daysElapsed >= MIN_PACE_DAYS
    const result = new Map<string, AccountInsight>()
    for (const a of accounts) {
        const act = byAccount.get(a.id)!
        // Rent leaving on day 2 mustn't make the account look like it's draining daily.
        const dailyOut = canPace ? act.everydayOut / daysElapsed : 0
        const runwayDays = dailyOut > 0 && a.balance > 0 ? Math.floor(a.balance / dailyOut) : null
        const health: AccountHealth = a.balance < 0
            ? 'overdrawn'
            : runwayDays !== null && runwayDays < LOW_RUNWAY_DAYS ? 'low' : 'ok'
        result.set(a.id, { ...act, runwayDays, health })
    }
    return result
}

const TYPE_LABEL: Record<string, string> = { bank: 'Bank', cash: 'Cash' }

/** One account's second line: how long it lasts at its own pace, or why that isn't shown. */
export function accountLine(account: Account, insight: AccountInsight | undefined): { text: string; negative: boolean } {
    if (account.balance < 0) return { text: 'Overdrawn', negative: true }
    if (account.is_savings) return { text: 'Not counted as spendable', negative: false }
    if (insight?.runwayDays != null) return { text: `Lasts ~${insight.runwayDays} day${insight.runwayDays === 1 ? '' : 's'}`, negative: false }
    return { text: TYPE_LABEL[account.type] ?? 'Account', negative: false }
}

/** Top-ups are suggested in round steps of this much. */
const TOP_UP_STEP = 50_000

export interface RunOutWarning {
    account: Account
    runwayDays: number
    /** Its everyday spending per day so far this period. */
    dailyOut: number
    /** Where a top-up would come from: the spendable account with the most money, else any other. */
    source: Account | null
    /** Enough to reach payday at its pace, in round steps, never more than the source holds; null without a payday. */
    topUp: number | null
}

/**
 * The everyday account that runs out first at its own pace, when that's before payday (or
 * within LOW_RUNWAY_DAYS when payday isn't known). Savings accounts are left out: they
 * aren't spent from.
 */
export function runOutFirst(
    accounts: Account[],
    insights: Map<string, AccountInsight>,
    daysElapsed: number,
    daysToPayday: number | null,
): RunOutWarning | null {
    const limit = daysToPayday ?? LOW_RUNWAY_DAYS
    let first: { account: Account; runwayDays: number } | null = null
    for (const a of accounts) {
        const runway = insights.get(a.id)?.runwayDays ?? null
        if (a.is_savings || runway === null || runway >= limit) continue
        if (!first || runway < first.runwayDays) first = { account: a, runwayDays: runway }
    }
    if (!first) return null

    const others = accounts.filter(a => a.id !== first.account.id && a.balance > 0).sort((a, b) => b.balance - a.balance)
    const source = others.find(a => !a.is_savings) ?? others[0] ?? null
    const dailyOut = (insights.get(first.account.id)?.everydayOut ?? 0) / Math.max(1, daysElapsed)

    let topUp: number | null = null
    if (daysToPayday !== null && source) {
        const need = dailyOut * daysToPayday - first.account.balance
        const rounded = Math.max(TOP_UP_STEP, Math.ceil(need / TOP_UP_STEP) * TOP_UP_STEP)
        topUp = Math.min(rounded, source.balance)
    }
    return { account: first.account, runwayDays: first.runwayDays, dailyOut, source, topUp }
}

export interface TrendPoint {
    label: string
    value: number
}

/** Total balance at each recent close, then today's total as the last point. */
export function balanceTrend(periods: PayPeriod[], currentTotal: number): TrendPoint[] {
    const closes = periods
        .filter(p => p.status === 'closed' && p.closing_balance !== null && p.end_date)
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(-TREND_PERIODS)
        .map(p => ({
            label: new Date(p.end_date! + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' }),
            value: p.closing_balance!,
        }))
    return [...closes, { label: 'Now', value: currentTotal }]
}
