import { formatCurrency, formatShortCurrency, getDaysBetween } from '@/lib/helpers'
import { resolveCategoryKind } from '@/lib/category-kind'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { TransactionWithDetails } from '@/types'
import type { BillDue } from '@/features/bills/lib/bills'
import { shortDate } from '@/features/bills/lib/bill-labels'
import { getTopExpenseCategory } from './group-expenses-by-category'
import { groupExpensesByWeekday } from './group-expenses-by-weekday'

export type InsightTone = 'warning' | 'positive' | 'info' | 'neutral'

export interface Insight {
    id: string
    tone: InsightTone
    text: string
    /** Higher shows first; only the top few make it to the card. */
    priority: number
}

export interface PastPeriod {
    start_date: string
    transactions: TransactionWithDetails[]
}

export interface InsightInput {
    today: string
    periodStart: string
    stats: PeriodStats
    transactions: TransactionWithDetails[]
    /** Earlier periods, newest first, for "compared with usual". */
    history: PastPeriod[]
    /** The open period's bills (useBillReserve). */
    dues: BillDue[]
    subscriptionsPerYear: number
}

const MAX_INSIGHTS = 4

/** Spending as the stats count it: expenses that aren't savings. */
const isSpending = (t: TransactionWithDetails) => t.type === 'expense' && !t.category?.is_savings

/** Day 1 is the period's first day. */
const dayOf = (start: string, date: string) => getDaysBetween(start, date) + 1

function addDays(date: string, days: number): string {
    const [y, m, d] = date.split('-').map(Number)
    const t = new Date(Date.UTC(y, m - 1, d + days))
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

const pct = (part: number, whole: number) => Math.round((part / whole) * 100)

/** Spending up to day `day` of a period, in total and per category (bills left out of the categories). */
function spendingByDay(start: string, transactions: TransactionWithDetails[], day: number) {
    let total = 0
    const byCategory = new Map<string, { name: string; amount: number }>()
    for (const t of transactions) {
        if (!isSpending(t) || dayOf(start, t.date) > day) continue
        total += t.amount
        // Bills land when they're due, not as a habit, so they don't make a category "high".
        if (!t.category_id || resolveCategoryKind(t.category) === 'fixed') continue
        const entry = byCategory.get(t.category_id) ?? { name: t.category?.name ?? 'Uncategorized', amount: 0 }
        entry.amount += t.amount
        byCategory.set(t.category_id, entry)
    }
    return { total, byCategory }
}

function paceInsights({ stats, today }: InsightInput): Insight[] {
    const out: Insight[] = []
    if (stats.runwayDays !== null && stats.daysRemaining !== null && stats.runwayDays < stats.daysRemaining) {
        const early = stats.daysRemaining - stats.runwayDays
        out.push({
            id: 'run-out',
            tone: 'warning',
            priority: 100,
            text: `At this pace your money runs out around ${shortDate(addDays(today, Math.max(0, stats.runwayDays)))}, ${early} day${early === 1 ? '' : 's'} before the period ends.`,
        })
    } else if (stats.safeDaily !== null && stats.dailyAvg > stats.safeDaily) {
        out.push({
            id: 'pace-warning',
            tone: 'warning',
            priority: 70,
            text: `Spending faster than planned: ${formatCurrency(stats.dailyAvg)}/day against a safe ${formatCurrency(stats.safeDaily)}/day.`,
        })
    } else if (stats.projectedClose !== null && stats.projectedClose > 0) {
        out.push({
            id: 'on-track',
            tone: 'positive',
            priority: 40,
            text: `On track to finish the period with about ${formatShortCurrency(stats.projectedClose)} left.`,
        })
    }
    return out
}

function billInsights({ dues, subscriptionsPerYear }: InsightInput): Insight[] {
    const out: Insight[] = []
    const overdue = dues.filter(d => d.status === 'overdue')
    const soon = dues.filter(d => d.status === 'soon')
    const names = (list: BillDue[]) => list.slice(0, 2).map(d => d.bill.name).join(', ') + (list.length > 2 ? '…' : '')
    const sum = (list: BillDue[]) => list.reduce((s, d) => s + d.reserved, 0)
    if (overdue.length > 0) {
        out.push({
            id: 'bills-overdue',
            tone: 'warning',
            priority: 95,
            text: `${overdue.length} bill${overdue.length === 1 ? ' is' : 's are'} overdue: ${names(overdue)} (${formatShortCurrency(sum(overdue))}).`,
        })
    }
    if (soon.length > 0) {
        out.push({
            id: 'bills-soon',
            tone: 'info',
            priority: 75,
            text: `${soon.length} bill${soon.length === 1 ? '' : 's'} due this week: ${names(soon)} (${formatShortCurrency(sum(soon))}). Already set aside.`,
        })
    }
    if (subscriptionsPerYear > 0) {
        out.push({
            id: 'subscriptions',
            tone: 'neutral',
            priority: 10,
            text: `Your subscriptions add up to ${formatShortCurrency(subscriptionsPerYear)} a year.`,
        })
    }
    return out
}

/** This period so far against earlier periods at the same day. */
function comparisonInsights({ periodStart, today, stats, transactions, history }: InsightInput): Insight[] {
    const past = history.filter(p => p.transactions.some(isSpending))
    if (past.length === 0) return []
    const day = Math.max(1, Math.min(dayOf(periodStart, today), stats.totalDays ?? Infinity))
    // Too early in the period for a fair comparison.
    if (day < 5) return []

    const now = spendingByDay(periodStart, transactions, day)
    const before = past.map(p => spendingByDay(p.start_date, p.transactions, day))
    const usual = past.length > 1 ? 'your usual' : 'last period'
    const threshold = Math.max(50_000, stats.totalIncome * 0.02)
    const out: Insight[] = []

    // The whole of spending against the period before, at the same point.
    const last = before[0].total
    if (last > 0 && now.total > 0) {
        const change = pct(now.total - last, last)
        if (Math.abs(change) >= 10 && Math.abs(now.total - last) >= threshold) {
            out.push(change < 0
                ? { id: 'vs-last', tone: 'positive', priority: 50, text: `You’ve spent ${-change}% less than last period by day ${day} (${formatShortCurrency(now.total)} vs ${formatShortCurrency(last)}).` }
                : { id: 'vs-last', tone: 'warning', priority: 60, text: `You’ve spent ${change}% more than last period by day ${day} (${formatShortCurrency(now.total)} vs ${formatShortCurrency(last)}).` })
        }
    }

    // The category furthest above its usual, and the one furthest below.
    const changes = [...now.byCategory.entries()].map(([id, { name, amount }]) => {
        const expected = before.reduce((s, b) => s + (b.byCategory.get(id)?.amount ?? 0), 0) / before.length
        return { id, name, amount, expected }
    }).filter(c => c.expected > 0)

    const up = changes
        .filter(c => c.amount >= c.expected * 1.3 && c.amount - c.expected >= threshold)
        .sort((a, b) => (b.amount - b.expected) - (a.amount - a.expected))[0]
    if (up) {
        out.push({
            id: 'category-up',
            tone: 'warning',
            priority: 80,
            text: `${up.name} is ${pct(up.amount - up.expected, up.expected)}% above ${usual} by day ${day} (${formatShortCurrency(up.amount)} vs ${formatShortCurrency(up.expected)}).`,
        })
    }
    const down = changes
        .filter(c => c.amount <= c.expected * 0.7 && c.expected - c.amount >= threshold)
        .sort((a, b) => (b.expected - b.amount) - (a.expected - a.amount))[0]
    if (down) {
        out.push({
            id: 'category-down',
            tone: 'positive',
            priority: 35,
            text: `${down.name} is ${pct(down.expected - down.amount, down.expected)}% below ${usual}. Nice.`,
        })
    }
    return out
}

/** What this period's own transactions say, with no history needed. */
function periodInsights({ stats, transactions }: InsightInput): Insight[] {
    const spending = transactions.filter(isSpending)
    const out: Insight[] = []

    const top = getTopExpenseCategory(spending)
    if (top && pct(top.amount, stats.totalSpending) >= 40) {
        out.push({ id: 'top-category', tone: 'info', priority: 30, text: `Most of this period’s spending is going to ${top.name} (${pct(top.amount, stats.totalSpending)}%).` })
    }

    if (stats.noSpendDays > 0) {
        out.push({ id: 'no-spend-days', tone: 'positive', priority: 25, text: `${stats.noSpendDays} no-spend day${stats.noSpendDays === 1 ? '' : 's'} so far this period.` })
    }

    const biggest = spending.reduce<TransactionWithDetails | null>((mx, t) => (!mx || t.amount > mx.amount ? t : mx), null)
    if (biggest && pct(biggest.amount, stats.totalSpending) >= 15) {
        out.push({
            id: 'biggest-expense',
            tone: 'neutral',
            priority: 20,
            text: `Your biggest single expense was ${formatCurrency(biggest.amount)} on ${biggest.category?.name ?? 'an expense'} (${pct(biggest.amount, stats.totalSpending)}% of spending).`,
        })
    }

    const weekdays = groupExpensesByWeekday(spending)
    const weekdaySum = weekdays.reduce((s, d) => s + d.total, 0)
    if (weekdaySum > 0) {
        const topDay = weekdays.reduce((mx, d) => (d.total > mx.total ? d : mx), weekdays[0])
        if (pct(topDay.total, weekdaySum) >= 30) {
            out.push({ id: 'weekday-pattern', tone: 'neutral', priority: 15, text: `You tend to spend most on ${topDay.day}s: ${pct(topDay.total, weekdaySum)}% of this period’s spending.` })
        }
    }

    if (stats.totalIncome > 0) {
        // Savings aren't spending, so they count toward the rate, not against it.
        const unspent = stats.totalIncome - stats.totalSpending
        out.push(unspent < 0
            ? { id: 'overspent', tone: 'warning', priority: 85, text: `You’ve spent ${formatCurrency(-unspent)} more than came in this period.` }
            : { id: 'savings-rate', tone: pct(unspent, stats.totalIncome) >= 20 ? 'positive' : 'neutral', priority: 28, text: `${pct(unspent, stats.totalIncome)}% of income unspent so far this period.` })
    }
    return out
}

/** The few most useful lines about the open period, most pressing first. */
export function generateInsights(input: InsightInput): Insight[] {
    if (input.stats.totalSpending <= 0 && input.dues.length === 0) {
        return [{ id: 'no-spend', tone: 'neutral', priority: 0, text: 'No spending recorded yet this period.' }]
    }
    const all = [
        ...paceInsights(input),
        ...billInsights(input),
        ...(input.stats.totalSpending > 0 ? [...comparisonInsights(input), ...periodInsights(input)] : []),
    ]
    if (all.length === 0) {
        return [{ id: 'fallback', tone: 'neutral', priority: 0, text: 'Keep logging transactions to see how this period is trending.' }]
    }
    return all.sort((a, b) => b.priority - a.priority).slice(0, MAX_INSIGHTS)
}
