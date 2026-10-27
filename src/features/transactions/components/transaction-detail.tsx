import { useState } from 'react'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAccounts, useBills } from '@/queries'
import { transactionsService } from '@/services/transactions.service'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { isTransfer } from '@/lib/transaction-type'
import { cn } from '@/lib/utils'
import { CategoryTile } from '@/features/categories/components/category-icon'
import type { TransactionWithDetails } from '@/types'
import { entryTime, linkedTo, txTitle, type TransactionLink } from '../lib/ledger'
import { TypeIcon } from './type-icon'

/** What deleting a linked transaction also does, in the words the sheet shows. */
function linkNote(link: TransactionLink, tx: TransactionWithDetails): string {
    if (link === 'transfer') return 'Part of a transfer. Deleting it removes both sides.'
    if (link === 'wish') return 'Made from your wish list. Deleting it also takes it off the wish.'
    return tx.type === 'expense'
        ? 'A debt payment. Deleting it puts the amount back on the debt.'
        : 'Made from your debts. Deleting it won’t change the debt.'
}

function typeLabel(tx: TransactionWithDetails): string {
    if (isTransfer(tx.type)) return tx.type === 'transfer_in' ? 'Money in · not income' : 'Money out · not spending'
    if (tx.type === 'income') return 'Income'
    return tx.category?.is_savings ? 'Saved' : 'Expense'
}

const ACTION_BTN = 'flex-1 h-12 rounded-[14px] bg-surface-hover text-[13.5px] font-semibold text-ink hover:bg-line-soft transition-colors flex items-center justify-center gap-2'

interface TransactionDetailProps {
    tx: TransactionWithDetails
    readOnly: boolean
    onEdit: () => void
    onDelete: () => void
    /** After the transaction was moved into a savings account (it's a transfer now). */
    onMoved: () => void
}

/**
 * A savings expense recorded before savings accounts existed, or by mistake: the money
 * went into a savings account rather than leaving. One tap turns it into that transfer.
 */
function MoveToSavings({ tx, onMoved }: { tx: TransactionWithDetails; onMoved: () => void }) {
    const { data: accounts } = useAccounts()
    const [movingTo, setMovingTo] = useState<string | null>(null)
    const targets = (accounts ?? []).filter(a => a.is_savings && a.id !== tx.account_id)
    if (targets.length === 0) return null

    const move = async (accountId: string, name: string) => {
        setMovingTo(accountId)
        const { error } = await transactionsService.moveToSavings(tx.id, accountId)
        setMovingTo(null)
        if (error) { toast.error(error); return }
        toast.success(`Moved into ${name}.`)
        onMoved()
    }

    return (
        <div className="rounded-[14px] bg-line-soft px-3 py-2.5 text-[12px] text-muted-ink leading-relaxed">
            Did this money go into a savings account? Move it there: it stays in your balance and still counts as saved.
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                {targets.map(a => (
                    <button
                        key={a.id}
                        type="button"
                        onClick={() => move(a.id, a.name)}
                        disabled={movingTo !== null}
                        className="flex items-center gap-1.5 font-semibold text-brand-ink underline underline-offset-2 disabled:opacity-50"
                    >
                        {movingTo === a.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Move to {a.name}
                    </button>
                ))}
            </div>
        </div>
    )
}

function addedAt(createdAt: string | null): string | null {
    if (!createdAt) return null
    const d = new Date(createdAt)
    return Number.isNaN(d.getTime())
        ? null
        : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** One transaction in full — tapping a row lands here instead of a hidden gesture. */
export function TransactionDetail({ tx, readOnly, onEdit, onDelete, onMoved }: TransactionDetailProps) {
    const linked = linkedTo(tx)
    const added = addedAt(tx.created_at)
    const { data: bills } = useBills()
    const paysBill = tx.recurring_bill_id ? bills?.find(b => b.id === tx.recurring_bill_id) : undefined
    // A transfer row has no category and its money belongs to the transfer or debt, so
    // there's nothing the edit form could change; delete it and record it again instead.
    const editable = !isTransfer(tx.type)

    const time = entryTime(tx)
    const day = new Date(tx.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    // The note is the title; with none, the category (or type) already is, so it isn't repeated.
    const kicker = [tx.note ? (tx.category?.name ?? typeLabel(tx)) : typeLabel(tx), time ? `${day}, ${time}` : day].join(' · ')

    const facts: { label: string; value: string }[] = [
        ...(isTransfer(tx.type) ? [] : [{ label: 'Category', value: tx.category?.name ?? 'Uncategorised' }]),
        // Deleting it makes the bill due again, which the bills card then shows.
        ...(paysBill ? [{ label: 'Pays bill', value: paysBill.name }] : []),
        { label: tx.type === 'income' || tx.type === 'transfer_in' ? 'Into' : 'Paid from', value: tx.account.name },
        { label: 'Date', value: formatDate(tx.date) },
        ...(added ? [{ label: 'Added', value: added }] : []),
    ]

    return (
        <div className="space-y-4 pb-2">
            <div>
                <div className="flex items-center gap-2.5">
                    <CategoryTile category={tx.category} className="w-7 h-7 rounded-[9px]">
                        {!tx.category && <TypeIcon type={tx.type} className="w-4 h-4" />}
                    </CategoryTile>
                    <p className="text-[12.5px] text-muted-ink truncate">{kicker}</p>
                </div>
                <p className="mt-3 text-[20px] font-semibold tracking-[-0.01em] leading-snug text-ink break-words">{txTitle(tx)}</p>
                <p className={cn(
                    'mt-1 text-[32px] font-semibold tracking-[-0.02em] leading-tight tabular-nums',
                    isTransfer(tx.type) ? 'text-muted-ink' : tx.type === 'income' ? 'text-brand' : 'text-ink'
                )}>
                    {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
                </p>
            </div>

            <dl className="divide-y divide-line-soft">
                {facts.map(f => (
                    <div key={f.label} className="flex items-center justify-between gap-3 py-3">
                        <dt className="text-[13px] text-muted-ink">{f.label}</dt>
                        <dd className="text-[13.5px] font-medium text-ink text-right truncate">{f.value}</dd>
                    </div>
                ))}
            </dl>

            {linked && (
                <p className="rounded-[14px] bg-line-soft text-muted-ink px-3 py-2.5 text-[12px] leading-relaxed">
                    {linkNote(linked, tx)}
                </p>
            )}

            {paysBill && !readOnly && (
                <p className="rounded-[14px] bg-line-soft text-muted-ink px-3 py-2.5 text-[12px] leading-relaxed">
                    Pays {paysBill.name}. Deleting it makes the bill due again, and held back from what’s left this period.
                </p>
            )}

            {!readOnly && !linked && tx.type === 'expense' && tx.category?.is_savings && (
                <MoveToSavings tx={tx} onMoved={onMoved} />
            )}

            {readOnly ? (
                <p className="text-center text-[11.5px] text-muted-ink pt-1">This period is closed, so its transactions are read-only.</p>
            ) : (
                <div className="flex gap-2.5 pt-1">
                    <button type="button" onClick={onDelete} className={cn(ACTION_BTN, 'hover:text-negative')}>
                        <Trash2 aria-hidden="true" className="w-4 h-4" /> Delete
                    </button>
                    {editable && (
                        <button type="button" onClick={onEdit} className={ACTION_BTN}>
                            <Pencil aria-hidden="true" className="w-4 h-4" /> Edit
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
