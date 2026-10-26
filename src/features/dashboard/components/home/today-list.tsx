import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '@/lib/helpers'
import { amountColor, isInflow } from '@/lib/transaction-type'
import { cn } from '@/lib/utils'
import { CategoryTile } from '@/features/categories/components/category-icon'
import { latestFirst, txTitle } from '@/features/transactions/lib/ledger'
import type { TransactionWithDetails } from '@/types'
import { HomeSection } from './home-section'

/** "12:40", the time the entry was made; only when it was made on the day it's for. */
function entryTime(tx: TransactionWithDetails): string | null {
    if (!tx.created_at) return null
    const at = new Date(tx.created_at)
    const local = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
    if (local !== tx.date.slice(0, 10)) return null
    return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
}

/** One row: the note is the title, then "Category · Account · time". */
export function HomeTxRow({ tx }: { tx: TransactionWithDetails }) {
    const title = txTitle(tx)
    const meta = [
        tx.category && tx.category.name !== title ? tx.category.name : null,
        tx.account?.name,
        entryTime(tx),
    ].filter(Boolean).join(' · ')
    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-line-soft last:border-b-0">
            <CategoryTile category={tx.category} className="w-10 h-10 rounded-[12px]" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] text-ink">{title}</p>
                {meta && <p className="truncate text-[12px] text-muted-ink">{meta}</p>}
            </div>
            <p className={cn('shrink-0 text-[14px] font-medium tabular-nums', amountColor(tx.type))}>
                {isInflow(tx.type) ? '+' : ''}{formatCurrency(tx.amount)}
            </p>
        </div>
    )
}

/** Today's entries, latest first, with what went out today on the right. */
export function TodayList({ transactions, today }: { transactions: TransactionWithDetails[]; today: string }) {
    const todays = useMemo(
        () => transactions.filter(t => t.date.slice(0, 10) === today).sort(latestFirst),
        [transactions, today]
    )
    const spent = todays.filter(t => t.type === 'expense' && !t.category?.is_savings).reduce((s, t) => s + t.amount, 0)

    return (
        <HomeSection
            title="Today"
            aside={spent > 0
                ? <span className="text-[13px] text-muted-ink tabular-nums">{formatCurrency(spent)}</span>
                : <Link to="/transactions" className="text-[13px] font-medium text-brand-ink">Ledger</Link>}
        >
            {todays.length === 0 ? (
                <p className="py-2 text-[13px] text-muted-ink">Nothing logged yet today.</p>
            ) : (
                <div>
                    {todays.map(tx => <HomeTxRow key={tx.id} tx={tx} />)}
                </div>
            )}
        </HomeSection>
    )
}

/** For a closed period there's no "today": its last few entries instead. */
export function LatestList({ transactions }: { transactions: TransactionWithDetails[] }) {
    const latest = useMemo(
        () => [...transactions].sort((a, b) => b.date.localeCompare(a.date) || latestFirst(a, b)).slice(0, 5),
        [transactions]
    )
    if (latest.length === 0) return null
    return (
        <HomeSection title="Last entries" aside={<Link to="/transactions" className="text-[13px] font-medium text-brand-ink">Ledger</Link>}>
            <div>
                {latest.map(tx => <HomeTxRow key={tx.id} tx={tx} />)}
            </div>
        </HomeSection>
    )
}
