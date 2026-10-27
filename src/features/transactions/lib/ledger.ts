import type { TransactionWithDetails } from '@/types'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { BillDue } from '@/features/bills/lib/bills'
import { isEverydaySpending } from '@/lib/spending-pace'
import { isTransfer } from '@/lib/transaction-type'

/** Rows the debts feature wrote before transactions carried debt_id (see debts.service). */
const DEBT_CATEGORY_NAMES = new Set(['Debt Payment', 'Receivable'])
const DEBT_NOTE = /^(Debt payment|Debt received|Lent to|Collected from) —/

export type TransactionLink = 'wish' | 'debt' | 'transfer'

/** The ledger's two views: the list (with search) and the period calendar. */
export type LedgerView = 'list' | 'calendar'

/**
 * The record a transaction belongs to, when another feature made it. Its money belongs
 * to that record: the database refuses edits to it, deleting it updates the record
 * (or, for a transfer, deletes the other side), and an undo can't put it back.
 */
export function linkedTo(tx: Pick<TransactionWithDetails, 'wish_list_item_id' | 'transfer_id' | 'debt_id' | 'category' | 'note'>): TransactionLink | null {
    if (tx.transfer_id) return 'transfer'
    if (tx.wish_list_item_id) return 'wish'
    if (tx.debt_id) return 'debt'
    if ((tx.category && DEBT_CATEGORY_NAMES.has(tx.category.name)) || (tx.note && DEBT_NOTE.test(tx.note))) return 'debt'
    return null
}

export function txTitle(tx: TransactionWithDetails): string {
    if (tx.note || tx.category?.name) return (tx.note || tx.category?.name)!
    if (isTransfer(tx.type)) return 'Transfer'
    return tx.type === 'income' ? 'Income' : 'Expense'
}

/** Spending as the hero counts it: expenses that aren't savings. */
export const isSpending = (tx: Pick<TransactionWithDetails, 'type' | 'category'>) =>
    tx.type === 'expense' && !tx.category?.is_savings

/** An expense in a savings category: set aside, not spent. */
export const isSaving = (tx: Pick<TransactionWithDetails, 'type' | 'category'>) =>
    tx.type === 'expense' && !!tx.category?.is_savings

/** Within a day, the latest entry first — the order every ledger view lists a day in. */
export const latestFirst = (a: TransactionWithDetails, b: TransactionWithDetails) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? '')

export interface DayGroup {
    date: string
    txs: TransactionWithDetails[]
    income: number
    /** Expenses minus savings. */
    spending: number
    savings: number
}

/** Newest day first; within a day, the latest entry first. */
export function groupByDate(txs: TransactionWithDetails[]): DayGroup[] {
    const byDate = new Map<string, DayGroup>()
    for (const tx of txs) {
        let g = byDate.get(tx.date)
        if (!g) { g = { date: tx.date, txs: [], income: 0, spending: 0, savings: 0 }; byDate.set(tx.date, g) }
        g.txs.push(tx)
        if (tx.type === 'income') g.income += tx.amount
        else if (isSaving(tx)) g.savings += tx.amount
        else if (isSpending(tx)) g.spending += tx.amount
    }
    const groups = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
    for (const g of groups) g.txs.sort(latestFirst)
    return groups
}

export type TypeFilter = 'all' | 'expense' | 'income' | 'transfer'

export interface LedgerFilter {
    query: string
    type: TypeFilter
    /** A category id, 'none' for uncategorised, or null for any. */
    categoryId: string | null
}

export function applyFilter(txs: TransactionWithDetails[], { query, type, categoryId }: LedgerFilter): TransactionWithDetails[] {
    const q = query.trim().toLowerCase()
    // "50.000", "Rp 50,000" and "50000" all mean the amount 50000.
    const digits = /^(rp\.?)?[\d.,\s]+$/.test(q) ? q.replace(/\D/g, '') : null
    return txs.filter(tx => {
        if (type === 'transfer' ? !isTransfer(tx.type) : type !== 'all' && tx.type !== type) return false
        if (categoryId === 'none' ? tx.category_id !== null : categoryId && tx.category_id !== categoryId) return false
        if (!q) return true
        if (digits && String(tx.amount).includes(digits)) return true
        return [tx.note, tx.category?.name, tx.account.name, String(tx.amount)]
            .some(v => v?.toLowerCase().includes(q))
    })
}

export interface CategoryFacet {
    id: string
    name: string
    count: number
    total: number
}

/** The categories used in these transactions, biggest total first — the filter chips. */
export function categoryFacets(txs: TransactionWithDetails[]): CategoryFacet[] {
    const map = new Map<string, CategoryFacet>()
    for (const tx of txs) {
        if (!tx.category) continue
        const f = map.get(tx.category.id) ?? { id: tx.category.id, name: tx.category.name, count: 0, total: 0 }
        f.count++
        f.total += tx.amount
        map.set(tx.category.id, f)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
}

/** Spending (savings excluded) per day: the calendar's bars. */
export function dailySpending(txs: TransactionWithDetails[]): Map<string, number> {
    const map = new Map<string, number>()
    for (const tx of txs) {
        if (!isSpending(tx)) continue
        map.set(tx.date, (map.get(tx.date) ?? 0) + tx.amount)
    }
    return map
}

/**
 * Everyday spending per day (no savings, no bills or other one-offs): what's held against
 * the daily allowance, the same part of spending the allowance is worked out for.
 */
export function dailyEverydaySpending(txs: TransactionWithDetails[], periodIncome: number): Map<string, number> {
    const map = new Map<string, number>()
    for (const tx of txs) {
        if (!isEverydaySpending(tx, periodIncome)) continue
        map.set(tx.date, (map.get(tx.date) ?? 0) + tx.amount)
    }
    return map
}

export interface DailyAllowance {
    /**
     * The period's everyday money (income less savings and one-offs), spread evenly over
     * its days. Fixed for the whole period, so a past day is judged by what it had then,
     * not by today's shrinking safe amount.
     */
    amount: number
}

/** What a day's everyday spending is held against, or null when there's no income to share. */
export function dailyAllowance(
    stats: Pick<PeriodStats, 'totalIncome' | 'totalSavings' | 'oneOffSpending' | 'totalDays'>
): DailyAllowance | null {
    if (stats.totalIncome <= 0 || !stats.totalDays) return null
    return { amount: (stats.totalIncome - stats.totalSavings - stats.oneOffSpending) / stats.totalDays }
}

/**
 * The bills an expense in this category could be paying: still due, set up with this
 * category. Offered, never assumed — only the user knows a 2jt "Housing" expense is the rent.
 */
export function unpaidBillsFor(dues: BillDue[], categoryId: string | null | undefined): BillDue[] {
    if (!categoryId) return []
    return dues.filter(d => d.outstanding > 0 && d.bill.category_id === categoryId)
}

/**
 * Past the day's share. With no share at all (savings and one-offs took the whole income)
 * nothing is marked: every day would be "over", which says nothing.
 */
export function isOverAllowance(spent: number, allowance: DailyAllowance | null): boolean {
    return allowance !== null && allowance.amount > 0 && spent > allowance.amount
}

/** A day's money in less money out; transfers only change hands, so they don't count. */
export const dayNet = (g: Pick<DayGroup, 'income' | 'spending' | 'savings'>) => g.income - g.spending - g.savings

export interface LedgerRows {
    /** What the list shows: a transfer is one row (its outgoing side) when both sides are here. */
    rows: TransactionWithDetails[]
    /** For a transfer row shown on its own: the account on the other side. */
    otherSide: Map<string, string>
}

/**
 * A transfer is written as two rows, money out of one account and into another. The list
 * shows it once, as "BCA → GoPay", on the outgoing side; deleting that side removes both.
 * A side whose partner isn't loaded (or that has none, like a balance adjustment) stays.
 */
export function pairTransfers(txs: TransactionWithDetails[]): LedgerRows {
    const outs = new Map<string, TransactionWithDetails>()
    const ins = new Map<string, TransactionWithDetails>()
    for (const tx of txs) {
        if (!tx.transfer_id) continue
        if (tx.type === 'transfer_out') outs.set(tx.transfer_id, tx)
        else if (tx.type === 'transfer_in') ins.set(tx.transfer_id, tx)
    }
    const otherSide = new Map<string, string>()
    const hidden = new Set<string>()
    for (const [id, out] of outs) {
        const into = ins.get(id)
        if (!into) continue
        otherSide.set(out.id, into.account.name)
        hidden.add(into.id)
    }
    return { rows: hidden.size ? txs.filter(t => !hidden.has(t.id)) : txs, otherSide }
}

/**
 * The time a row was entered, when it was entered on the day it's dated: then it's when
 * the money moved. An entry added later for an earlier day has no time worth showing.
 */
export function entryTime(tx: Pick<TransactionWithDetails, 'date' | 'created_at'>): string | null {
    if (!tx.created_at) return null
    const d = new Date(tx.created_at)
    if (Number.isNaN(d.getTime())) return null
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (local !== tx.date) return null
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export interface MatchSummary {
    count: number
    /** Expenses, savings included: money that left. */
    out: number
    income: number
}

/** The one line above search results: how many times, and how much. Transfers count as times only. */
export function matchSummary(txs: TransactionWithDetails[]): MatchSummary {
    let out = 0
    let income = 0
    for (const tx of txs) {
        if (tx.type === 'expense') out += tx.amount
        else if (tx.type === 'income') income += tx.amount
    }
    return { count: txs.length, out, income }
}

/**
 * The notes last written for this category, newest first and each once, from the
 * transactions already loaded. Offered under the note field for a tap; never filled in.
 */
export function recentNotes(
    txs: TransactionWithDetails[] | undefined,
    categoryId: string | null | undefined,
    { exclude, limit = 3 }: { exclude?: string; limit?: number } = {},
): string[] {
    if (!txs || !categoryId) return []
    const notes: string[] = []
    const seen = new Set<string>()
    const sorted = txs
        .filter(t => t.category_id === categoryId && t.id !== exclude && t.note?.trim())
        .sort((a, b) => b.date.localeCompare(a.date) || latestFirst(a, b))
    for (const t of sorted) {
        const note = t.note!.trim()
        const key = note.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        notes.push(note)
        if (notes.length === limit) break
    }
    return notes
}
