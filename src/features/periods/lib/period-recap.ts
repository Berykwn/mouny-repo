import { summarizeTransactions, unspentPct, type PeriodSummary } from '@/lib/period-summary'
import type { TransactionWithDetails } from '@/types'

/** Closed periods a recap compares against. */
export const RECAP_PERIODS = 6

/** Past periods needed before "usual" means anything. */
const MIN_HISTORY = 2

/** A category has to move at least this much, and by this share, to stand out. */
const MIN_CHANGE_SHARE = 0.15
const MIN_CHANGE_AMOUNT = 50_000

export function median(values: number[]): number | null {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface CategoryChange {
    categoryId: string
    name: string
    current: number
    usual: number
    /** Rounded percent against usual, e.g. 38 or -18. */
    pct: number
}

export interface PeriodRecap {
    summary: PeriodSummary
    /** Income not spent: savings plus leftover. */
    kept: number
    /** Kept as a share of income, or null without income. */
    keptPct: number | null
    /** The median kept share of the earlier periods, or null with too few of them. */
    medianPct: number | null
    /** The biggest rise and the biggest drop against the category's usual, when they're big enough. */
    changes: CategoryChange[]
    /** The single largest expense (savings left out). */
    biggest: TransactionWithDetails | null
}

/** What each spending category (savings left out) added up to in one period's transactions. */
function spendingByCategory(txs: TransactionWithDetails[]): Map<string, { name: string; total: number }> {
    const map = new Map<string, { name: string; total: number }>()
    for (const t of txs) {
        if (t.type !== 'expense' || !t.category || t.category.is_savings) continue
        const entry = map.get(t.category.id) ?? { name: t.category.name, total: 0 }
        entry.total += t.amount
        map.set(t.category.id, entry)
    }
    return map
}

/**
 * The recap shown when a period closes: how much of the income was kept next to the usual
 * share, the categories that moved most against their usual (the median of the earlier
 * periods, a quiet period counting as zero), and the largest single expense.
 */
export function periodRecap(current: TransactionWithDetails[], history: TransactionWithDetails[][]): PeriodRecap {
    const summary = summarizeTransactions(current)
    const keptPct = unspentPct(summary.unspent, summary.income)

    const pastPcts = history
        .map(txs => { const s = summarizeTransactions(txs); return unspentPct(s.unspent, s.income) })
        .filter((p): p is number => p !== null)
    const medianPct = pastPcts.length >= MIN_HISTORY ? median(pastPcts) : null

    const changes: CategoryChange[] = []
    if (history.length >= MIN_HISTORY) {
        const now = spendingByCategory(current)
        const past = history.map(spendingByCategory)
        const ids = new Set([...now.keys(), ...past.flatMap(m => [...m.keys()])])
        const all: CategoryChange[] = []
        for (const id of ids) {
            const usual = median(past.map(m => m.get(id)?.total ?? 0)) ?? 0
            const cur = now.get(id)?.total ?? 0
            if (usual <= 0) continue
            const diff = cur - usual
            if (Math.abs(diff) < MIN_CHANGE_AMOUNT || Math.abs(diff) / usual < MIN_CHANGE_SHARE) continue
            const name = now.get(id)?.name ?? past.find(m => m.has(id))!.get(id)!.name
            all.push({ categoryId: id, name, current: cur, usual, pct: Math.round((diff / usual) * 100) })
        }
        const byAmount = (a: CategoryChange, b: CategoryChange) => Math.abs(b.current - b.usual) - Math.abs(a.current - a.usual)
        const up = all.filter(c => c.pct > 0).sort(byAmount)[0]
        const down = all.filter(c => c.pct < 0).sort(byAmount)[0]
        if (up) changes.push(up)
        if (down) changes.push(down)
    }

    let biggest: TransactionWithDetails | null = null
    for (const t of current) {
        if (t.type !== 'expense' || t.category?.is_savings) continue
        if (!biggest || t.amount > biggest.amount) biggest = t
    }

    return { summary, kept: summary.unspent, keptPct, medianPct, changes, biggest }
}
