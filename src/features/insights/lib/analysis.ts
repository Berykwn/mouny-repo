import { getDaysBetween } from '@/lib/helpers'
import { resolveCategoryKind } from '@/lib/category-kind'
import { isEverydaySpending } from '@/lib/spending-pace'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { TransactionWithDetails } from '@/types'

/**
 * The numbers behind Insights. Every "usual" is the median of the user's own last closed
 * periods (up to six), never anyone else's. Pure, so each sentence can be tested.
 */

/** How many closed periods "your usual" is drawn from, at most. */
export const USUAL_PERIODS = 6

export interface PastPeriod {
    start_date: string
    end_date: string | null
    transactions: TransactionWithDetails[]
}

export function median(values: number[]): number | null {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Spending as the stats count it: expenses that aren't savings. */
export const isSpending = (t: TransactionWithDetails) => t.type === 'expense' && !t.category?.is_savings

/** Everyday and lifestyle spending: the part habits are made of (no bills, no savings). */
export const isVariable = (t: TransactionWithDetails) => {
    if (!isSpending(t)) return false
    const kind = resolveCategoryKind(t.category)
    return kind === 'daily' || kind === 'lifestyle'
}

const dayIndex = (start: string, date: string) => getDaysBetween(start, date.slice(0, 10))

function addDays(date: string, days: number): string {
    const [y, m, d] = date.split('-').map(Number)
    const t = new Date(Date.UTC(y, m - 1, d + days))
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

// ─── Forecast ────────────────────────────────────────────────────────────────

export interface Forecast {
    /** Income minus spending by the end, if the everyday pace holds. Savings count as kept. */
    kept: number
    low: number
    high: number
    /** kept as a share of income; null without income. */
    rate: number | null
}

/**
 * Where the open period ends. The range is one standard deviation of daily everyday
 * spending, spread over the days left (it grows with the square root of the days).
 */
export function forecastKept(stats: PeriodStats, periodStart: string, transactions: TransactionWithDetails[]): Forecast | null {
    if (stats.isClosed || stats.projectedClose === null || stats.daysRemaining === null) return null
    const kept = stats.projectedClose + stats.totalSavings
    const daily = new Array(stats.daysElapsed).fill(0) as number[]
    for (const t of transactions) {
        if (!isEverydaySpending(t, stats.totalIncome)) continue
        const i = dayIndex(periodStart, t.date)
        if (i >= 0 && i < daily.length) daily[i] += t.amount
    }
    const mean = daily.reduce((s, v) => s + v, 0) / daily.length
    const sd = Math.sqrt(daily.reduce((s, v) => s + (v - mean) ** 2, 0) / daily.length)
    const spread = sd * Math.sqrt(stats.daysRemaining)
    return {
        kept,
        low: kept - spread,
        high: kept + spread,
        rate: stats.totalIncome > 0 ? kept / stats.totalIncome : null,
    }
}

export interface PacePoint {
    day: number
    date: string
    /** Spending so far this period, up to today. */
    actual?: number
    /** The pace carried on from today to the end. */
    forecast?: number
    /** The lowest and highest earlier periods had spent by this day. */
    band?: [number, number]
}

function cumulative(start: string, transactions: TransactionWithDetails[], days: number): number[] {
    const daily = new Array(days).fill(0) as number[]
    for (const t of transactions) {
        if (!isSpending(t)) continue
        const i = dayIndex(start, t.date)
        if (i >= 0 && i < days) daily[i] += t.amount
    }
    let sum = 0
    return daily.map(v => (sum += v))
}

/** Spending by day of the period: this one so far, its forecast, and the range of earlier ones. */
export function paceSeries(stats: PeriodStats, periodStart: string, transactions: TransactionWithDetails[], history: PastPeriod[]): PacePoint[] {
    const totalDays = stats.totalDays ?? stats.daysElapsed
    const actual = cumulative(periodStart, transactions, totalDays)
    const past = history.map(p => cumulative(p.start_date, p.transactions, totalDays))
    const points: PacePoint[] = []
    const lastActual = actual[stats.daysElapsed - 1] ?? 0
    for (let i = 0; i < totalDays; i++) {
        const point: PacePoint = { day: i + 1, date: addDays(periodStart, i) }
        if (i < stats.daysElapsed) point.actual = actual[i]
        if (!stats.isClosed && stats.projectedSpend !== null && i >= stats.daysElapsed - 1) {
            // Straight from today to where the pace ends it (bills still due included).
            const end = stats.projectedSpend - stats.totalSavings
            const span = totalDays - stats.daysElapsed
            point.forecast = span > 0 ? lastActual + ((end - lastActual) * (i - stats.daysElapsed + 1)) / span : end
        }
        if (past.length > 0) {
            const values = past.map(c => c[i])
            point.band = [Math.min(...values), Math.max(...values)]
        }
        points.push(point)
    }
    return points
}

// ─── Unusual for you ─────────────────────────────────────────────────────────

export interface CategoryVariance {
    id: string
    name: string
    /** This period's total, or where its pace ends it while open. */
    current: number
    usual: number
    /** Percent above (+) or below (−) the usual. */
    pct: number
}

/** Changes within this much of the usual are noise, and left out. */
const VARIANCE_MIN_PCT = 5

function byCategory(transactions: TransactionWithDetails[]) {
    const map = new Map<string, { name: string; amount: number }>()
    for (const t of transactions) {
        if (!isVariable(t) || !t.category_id) continue
        const entry = map.get(t.category_id) ?? { name: t.category?.name ?? 'Uncategorized', amount: 0 }
        entry.amount += t.amount
        map.set(t.category_id, entry)
    }
    return map
}

/**
 * Each everyday and lifestyle category on pace for the period, against its median over
 * the earlier periods (a period without it counts as 0). Bills and savings are left out:
 * they're set amounts, not habits. Biggest rise first.
 */
export function categoryVariance(stats: PeriodStats, transactions: TransactionWithDetails[], history: PastPeriod[]): CategoryVariance[] {
    if (history.length === 0) return []
    const scale = stats.isClosed ? 1 : stats.totalDays ? stats.totalDays / stats.daysElapsed : null
    if (scale === null) return []
    const now = byCategory(transactions)
    const past = history.map(p => byCategory(p.transactions))
    const ids = new Set([...now.keys(), ...past.flatMap(m => [...m.keys()])])
    const out: CategoryVariance[] = []
    for (const id of ids) {
        const usual = median(past.map(m => m.get(id)?.amount ?? 0)) ?? 0
        if (usual <= 0) continue
        const current = (now.get(id)?.amount ?? 0) * scale
        const pct = Math.round(((current - usual) / usual) * 100)
        if (Math.abs(pct) < VARIANCE_MIN_PCT) continue
        const name = now.get(id)?.name ?? past.find(m => m.has(id))!.get(id)!.name
        out.push({ id, name, current, usual, pct })
    }
    return out.sort((a, b) => b.pct - a.pct)
}

// ─── Stand-out transactions ──────────────────────────────────────────────────

export interface StandOut {
    tx: TransactionWithDetails
    usual: number
    /** How many times the usual single entry, e.g. 2.1. */
    multiple: number
}

/** At this many times the usual single entry, a transaction stands out. */
export const STAND_OUT_MULTIPLE = 2
/** Entries a category needs in history before its usual means anything. */
const STAND_OUT_MIN_HISTORY = 3

/** This period's entries far above the median single entry of their category, before. */
export function standOuts(transactions: TransactionWithDetails[], history: PastPeriod[], limit = 3): StandOut[] {
    const amounts = new Map<string, number[]>()
    for (const t of history.flatMap(p => p.transactions)) {
        if (!isVariable(t) || !t.category_id) continue
        amounts.set(t.category_id, [...(amounts.get(t.category_id) ?? []), t.amount])
    }
    const out: StandOut[] = []
    for (const tx of transactions) {
        if (!isVariable(tx) || !tx.category_id) continue
        const past = amounts.get(tx.category_id)
        if (!past || past.length < STAND_OUT_MIN_HISTORY) continue
        const usual = median(past)!
        if (usual <= 0 || tx.amount < usual * STAND_OUT_MULTIPLE) continue
        out.push({ tx, usual, multiple: tx.amount / usual })
    }
    return out.sort((a, b) => b.multiple - a.multiple).slice(0, limit)
}

// ─── When you spend ──────────────────────────────────────────────────────────

export const TIME_BANDS = ['Morning', 'Lunch', 'Afternoon', 'Evening', 'Late'] as const
export type TimeBand = typeof TIME_BANDS[number]
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Morning 06–11, Lunch 11–14, Afternoon 14–18, Evening 18–22, Late 22–06. */
export function timeBand(hour: number): number {
    if (hour >= 6 && hour < 11) return 0
    if (hour >= 11 && hour < 14) return 1
    if (hour >= 14 && hour < 18) return 2
    if (hour >= 18 && hour < 22) return 3
    return 4
}

export interface Heatmap {
    /** [weekday Mon..Sun][band]: average spending per week. */
    cells: number[][]
    weeks: number
    total: number
    /** Entries left out because they were logged on another day, so their time isn't known. */
    untimed: number
    top: { weekday: string; band: TimeBand; share: number } | null
}

export const HEATMAP_WEEKS = 8

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Everyday and lifestyle spending over the last weeks, by weekday and the time the entry
 * was made. An entry logged on a later day has no real time, so it's left out, not guessed.
 */
export function spendingHeatmap(transactions: TransactionWithDetails[], today: string, weeks = HEATMAP_WEEKS): Heatmap {
    const from = addDays(today, -(weeks * 7 - 1))
    const cells = WEEKDAYS.map(() => TIME_BANDS.map(() => 0))
    let total = 0
    let untimed = 0
    let earliest: string | null = null
    for (const t of transactions) {
        const date = t.date.slice(0, 10)
        if (!isVariable(t) || date < from || date > today) continue
        if (!earliest || date < earliest) earliest = date
        const at = t.created_at ? new Date(t.created_at) : null
        if (!at || localDate(at) !== date) { untimed++; continue }
        const [y, m, d] = date.split('-').map(Number)
        const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
        cells[weekday][timeBand(at.getHours())] += t.amount
        total += t.amount
    }
    // Averaged over the weeks there's data for, so a new user isn't divided by eight.
    const covered = earliest ? Math.min(weeks, Math.max(1, Math.ceil((getDaysBetween(earliest, today) + 1) / 7))) : 1
    const avg = cells.map(row => row.map(v => v / covered))
    let top: Heatmap['top'] = null
    if (total > 0) {
        let best = { w: 0, b: 0, v: -1 }
        cells.forEach((row, w) => row.forEach((v, b) => { if (v > best.v) best = { w, b, v } }))
        top = { weekday: WEEKDAY_NAMES[best.w], band: TIME_BANDS[best.b], share: best.v / total }
    }
    return { cells: avg, weeks: covered, total, untimed, top }
}

// ─── Small but frequent ──────────────────────────────────────────────────────

export interface FrequentNote {
    note: string
    count: number
    total: number
}

/** An entry needs this many repeats in the period to count as a habit. */
const FREQUENT_MIN_COUNT = 3

/** Everyday and lifestyle entries grouped by their exact note (case ignored), biggest total first. */
export function frequentNotes(transactions: TransactionWithDetails[], limit = 5): { notes: FrequentNote[]; variableTotal: number } {
    const groups = new Map<string, FrequentNote>()
    let variableTotal = 0
    for (const t of transactions) {
        if (!isVariable(t)) continue
        variableTotal += t.amount
        const note = t.note?.trim()
        if (!note) continue
        const key = note.toLowerCase()
        const g = groups.get(key) ?? { note, count: 0, total: 0 }
        g.count++
        g.total += t.amount
        groups.set(key, g)
    }
    const notes = [...groups.values()]
        .filter(g => g.count >= FREQUENT_MIN_COUNT)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
    return { notes, variableTotal }
}

// ─── What if ─────────────────────────────────────────────────────────────────

export interface WhatIf {
    /** Kept by the end of this period, as it's going and with the change. */
    before: number
    after: number
    /** Saved over a whole period of the same length. */
    perPeriod: number
}

/** Spending `cutPerDay` less from tomorrow to the end of the period. */
export function whatIf(stats: PeriodStats, cutPerDay: number): WhatIf | null {
    if (stats.isClosed || stats.projectedClose === null || stats.daysRemaining === null || stats.totalDays === null) return null
    const before = stats.projectedClose + stats.totalSavings
    return { before, after: before + cutPerDay * stats.daysRemaining, perPeriod: cutPerDay * stats.totalDays }
}

/** Everyday-kind spending per day so far (one-offs left out): what the slider can trim. */
export function kindDailyPace(stats: PeriodStats, transactions: TransactionWithDetails[], kind: 'daily' | 'lifestyle'): number {
    const sum = transactions
        .filter(t => isEverydaySpending(t, stats.totalIncome) && resolveCategoryKind(t.category) === kind)
        .reduce((s, t) => s + t.amount, 0)
    return sum / stats.daysElapsed
}

// ─── Savings rate ────────────────────────────────────────────────────────────

export interface RatePoint {
    periodId: string
    label: string
    /** Share of income not spent; null without income. */
    rate: number | null
    /** The open period's rate is where its pace ends it. */
    projected: boolean
}

/** The rate a period should reach, as the 50/30/20 guide has it. */
export const RATE_GUIDE = 0.2
