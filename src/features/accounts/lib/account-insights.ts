import { getDaysBetween } from '@/lib/helpers'
import { isEverydaySpending } from '@/lib/spending-pace'
import type { Account, PayPeriod, TransactionWithDetails } from '@/types'

/** Days of data needed before a spending pace means anything (matches usePeriodStats). */
const MIN_PACE_DAYS = 3

/** An account whose own pace empties it within this many days is flagged as low. */
export const LOW_RUNWAY_DAYS = 7

/** Closed periods shown in the balance trend. */
const TREND_PERIODS = 6

// Composition colors, assigned by balance rank so the biggest account is always brand green.
const SHARE_COLORS = ['#6FA82B', '#3d6eb6', '#8b5cf6', '#f59e0b', '#14b8a6', '#ec4899']
const OTHERS_COLOR = '#c4c4be'
const MAX_SHARES = 4

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
        if (t.type === 'income') act.moneyIn += t.amount
        else if (t.type === 'expense') {
            act.moneyOut += t.amount
            if (isEverydaySpending(t, periodIncome)) act.everydayOut += t.amount
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

/**
 * Days the total balance covers at this period's everyday spending pace. Savings, bills
 * and other one-offs are left out — they're paid once, not burned through daily.
 */
export function totalRunwayDays(totalBalance: number, periodTxs: TransactionWithDetails[], daysElapsed: number): number | null {
    if (daysElapsed < MIN_PACE_DAYS || totalBalance <= 0) return null
    const periodIncome = periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const spending = periodTxs
        .filter(t => isEverydaySpending(t, periodIncome))
        .reduce((s, t) => s + t.amount, 0)
    if (spending <= 0) return null
    return Math.floor(totalBalance / (spending / daysElapsed))
}

export interface AccountShare {
    id: string
    name: string
    amount: number
    /** 0–100 of the positive balances. */
    percent: number
    color: string
}

/** How the positive balances split across accounts; small ones fold into "Others". */
export function accountShares(accounts: Account[]): AccountShare[] {
    const positive = accounts.filter(a => a.balance > 0).sort((a, b) => b.balance - a.balance)
    const total = positive.reduce((s, a) => s + a.balance, 0)
    if (total <= 0) return []

    const head = positive.slice(0, positive.length > MAX_SHARES ? MAX_SHARES - 1 : MAX_SHARES)
    const rest = positive.slice(head.length)
    const shares: AccountShare[] = head.map((a, i) => ({
        id: a.id,
        name: a.name,
        amount: a.balance,
        percent: (a.balance / total) * 100,
        color: SHARE_COLORS[i % SHARE_COLORS.length],
    }))
    if (rest.length > 0) {
        const amount = rest.reduce((s, a) => s + a.balance, 0)
        shares.push({ id: 'others', name: `${rest.length} others`, amount, percent: (amount / total) * 100, color: OTHERS_COLOR })
    }
    return shares
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
