import { availableToSpend, overdrawnBy, owedOn, roleOf } from '@/lib/account-roles'
import { periodShortName } from '@/lib/period-name'
import { formatShortCurrency, getDaysBetween } from '@/lib/helpers'
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
    /**
     * Days this account lasts at its own outflow pace, or null without a pace. Only
     * accounts spent from have one: everyday ones from their balance, credit ones from
     * what's left of their limit (none without a limit: there's nothing to run out of).
     */
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
        const left = runwayBase(a)
        const runwayDays = dailyOut > 0 && left !== null && left > 0 ? Math.floor(left / dailyOut) : null
        const health: AccountHealth = isOverdrawn(a)
            ? 'overdrawn'
            : runwayDays !== null && runwayDays < LOW_RUNWAY_DAYS ? 'low' : 'ok'
        result.set(a.id, { ...act, runwayDays, health })
    }
    return result
}

/** What a runway is measured against, or null when the account has none (see AccountInsight.runwayDays). */
function runwayBase(account: Account): number | null {
    switch (roleOf(account)) {
        case 'everyday': return account.balance
        case 'credit': return account.credit_limit == null ? null : availableToSpend(account)
        default: return null
    }
}

/**
 * Below where the account may go: under zero, or for a credit account under minus its
 * limit. A credit account below zero is just owing, not overdrawn.
 */
export const isOverdrawn = (account: Pick<Account, 'balance' | 'role' | 'credit_limit'>): boolean =>
    overdrawnBy(account) > 0

const TYPE_LABEL: Record<string, string> = { bank: 'Bank', cash: 'Cash', ewallet: 'E-wallet' }

const short = (n: number) => `Rp${formatShortCurrency(n)}`

/** A credit account's owing in a few words: "Rp1,2jt owed · Rp8,8jt available", or "No limit". */
export function creditLine(account: Account): string {
    const owed = owedOn(account)
    const available = availableToSpend(account)
    return [
        owed > 0 ? `${short(owed)} owed` : 'Nothing owed',
        available === Infinity ? 'No limit' : `${short(Math.max(0, available))} available`,
    ].join(' · ')
}

/** One account's second line: how long it lasts at its own pace, or why that isn't shown. */
export function accountLine(account: Account, insight: AccountInsight | undefined): { text: string; negative: boolean } {
    const role = roleOf(account)
    if (isOverdrawn(account)) return { text: role === 'credit' ? 'Over its limit' : 'Overdrawn', negative: true }
    if (role === 'credit') return { text: creditLine(account), negative: false }
    if (role === 'savings') return { text: 'Not counted as spendable', negative: false }
    if (insight?.runwayDays != null) return { text: `Lasts ~${insight.runwayDays} day${insight.runwayDays === 1 ? '' : 's'}`, negative: false }
    return { text: TYPE_LABEL[account.type] ?? 'Account', negative: false }
}

/** Where moved money comes from, first choice first: never a card. */
const SOURCE_RANK: Record<string, number> = { everyday: 0, savings: 1 }

/**
 * The account money is best moved from: the fullest everyday account, else the fullest
 * savings one. Moving money off a credit card would be borrowing, so it isn't offered.
 */
export function fullestSource(accounts: Account[], exceptId?: string): Account | null {
    return accounts
        .filter(a => a.id !== exceptId && a.balance > 0 && roleOf(a) in SOURCE_RANK)
        .sort((a, b) => SOURCE_RANK[roleOf(a)] - SOURCE_RANK[roleOf(b)] || b.balance - a.balance)[0] ?? null
}

/** Top-ups are suggested in round steps of this much. */
const TOP_UP_STEP = 50_000

export interface RunOutWarning {
    account: Account
    runwayDays: number
    /** Its everyday spending per day so far this period. */
    dailyOut: number
    /** Where a top-up would come from (see fullestSource). */
    source: Account | null
    /** Enough to reach payday at its pace, in round steps, never more than the source holds; null without a payday. */
    topUp: number | null
}

/**
 * The everyday account that runs out first at its own pace, when that's before payday (or
 * within LOW_RUNWAY_DAYS when payday isn't known). Only everyday accounts are warned
 * about: savings aren't spent from, and a card nearing its limit shows that on
 * its own row (its runway) rather than as a top-up suggestion, which would mean paying
 * the card off.
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
        if (roleOf(a) !== 'everyday' || runway === null || runway >= limit) continue
        if (!first || runway < first.runwayDays) first = { account: a, runwayDays: runway }
    }
    if (!first) return null

    const source = fullestSource(accounts, first.account.id)
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
            // The period's own name, the same as everywhere else (lib/period-name).
            label: periodShortName(p),
            value: p.closing_balance!,
        }))
    return [...closes, { label: 'Now', value: currentTotal }]
}
