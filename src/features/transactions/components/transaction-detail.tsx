import { Pencil, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { CategoryTile } from '@/features/categories/components/category-icon'
import type { TransactionWithDetails } from '@/types'
import { linkedTo } from '../lib/ledger'

const PRIMARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors flex items-center justify-center gap-2'

interface TransactionDetailProps {
    tx: TransactionWithDetails
    readOnly: boolean
    onEdit: () => void
    onDelete: () => void
}

function addedAt(createdAt: string | null): string | null {
    if (!createdAt) return null
    const d = new Date(createdAt)
    return Number.isNaN(d.getTime())
        ? null
        : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** One transaction in full — tapping a row lands here instead of a hidden gesture. */
export function TransactionDetail({ tx, readOnly, onEdit, onDelete }: TransactionDetailProps) {
    const isIncome = tx.type === 'income'
    const linked = linkedTo(tx)
    const added = addedAt(tx.created_at)

    const facts: { label: string; value: string }[] = [
        { label: 'Category', value: tx.category?.name ?? 'Uncategorised' },
        { label: 'Account', value: tx.account.name },
        { label: 'Date', value: formatDate(tx.date) },
        ...(added ? [{ label: 'Added', value: added }] : []),
    ]

    return (
        <div className="space-y-4 pb-2">
            <div className="flex items-center gap-3">
                <CategoryTile category={tx.category} className="w-12 h-12 rounded-[14px]">
                    {!tx.category && (isIncome
                        ? <TrendingUp className="w-5 h-5 text-positive" />
                        : <TrendingDown className="w-5 h-5 text-negative" />)}
                </CategoryTile>
                <div className="min-w-0">
                    <p className="text-[11px] text-muted-ink">
                        {isIncome ? 'Income' : tx.category?.is_savings ? 'Saved' : 'Expense'}
                    </p>
                    <p className={cn(
                        'text-[24px] font-medium tracking-[-0.02em] leading-tight tabular-nums',
                        isIncome ? 'text-positive' : 'text-ink'
                    )}>
                        {isIncome ? '+' : '−'}{formatCurrency(tx.amount)}
                    </p>
                </div>
            </div>

            {tx.note && (
                <p className="text-[13px] text-ink leading-relaxed">{tx.note}</p>
            )}

            <div className="rounded-[20px] bg-surface-soft border border-line-soft divide-y divide-line-soft">
                {facts.map(f => (
                    <div key={f.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <p className="text-[11.5px] text-muted-ink">{f.label}</p>
                        <p className="text-[12.5px] font-medium text-ink text-right truncate">{f.value}</p>
                    </div>
                ))}
            </div>

            {linked && (
                <p className="rounded-[14px] bg-info/10 text-info px-3 py-2.5 text-[12px] leading-relaxed">
                    Made from your {linked === 'wish' ? 'wish list' : 'debts'}.{' '}
                    {linked === 'wish'
                        ? 'Deleting it here won’t change what the wish shows as saved.'
                        : 'Deleting it here won’t change the debt’s remaining amount.'}
                </p>
            )}

            {readOnly ? (
                <p className="text-center text-[11.5px] text-muted-ink pt-1">This period is closed, so its transactions are read-only.</p>
            ) : (
                <div className="space-y-2 pt-1">
                    <button type="button" onClick={onEdit} className={PRIMARY_BTN}>
                        <Pencil className="w-4 h-4" /> Edit
                    </button>
                    <div className="flex items-center justify-center pt-1">
                        <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-negative py-2">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
