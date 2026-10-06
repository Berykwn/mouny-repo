import { Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { CATEGORY_KIND_META, resolveCategoryKind } from '@/lib/category-kind'
import type { Category, TransactionWithDetails } from '@/types'
import { CategoryTile } from './category-icon'
import { QuickAmountsEditor } from '@/features/quick-transactions/components/quick-amounts-editor'

const RECENT_COUNT = 5

interface CategoryDetailProps {
    category: Category
    /** This category's transactions in the active period. */
    transactions: TransactionWithDetails[]
    budget: number | undefined
    hasActivePeriod: boolean
    onEdit: () => void
    onDelete: () => void
}

/** One category's period activity, budget and recent transactions, with its actions. */
export function CategoryDetail({ category, transactions, budget, hasActivePeriod, onEdit, onDelete }: CategoryDetailProps) {
    const isIncome = category.type === 'income'
    const total = transactions.reduce((s, t) => s + t.amount, 0)
    const average = transactions.length > 0 ? total / transactions.length : 0
    const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, RECENT_COUNT)
    const ratio = budget ? total / budget : null
    const kindLabel = isIncome ? 'Income' : `Expense · ${CATEGORY_KIND_META[resolveCategoryKind(category)].label}`

    return (
        <div className="space-y-4 pb-2">
            <div className="flex items-center gap-3">
                <CategoryTile category={category} className="w-12 h-12 rounded-[14px]" />
                <div className="min-w-0">
                    <p className="text-[11px] text-muted-ink">{kindLabel}</p>
                    <p className="text-[24px] font-medium tracking-[-0.02em] leading-tight tabular-nums text-ink">
                        {formatCurrency(total)}
                    </p>
                    <p className="text-[11px] text-subtle-ink">{hasActivePeriod ? (isIncome ? 'received this period' : 'spent this period') : 'no active period'}</p>
                </div>
            </div>

            {budget !== undefined && ratio !== null && (
                <div className="rounded-[14px] border border-line p-3">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-ink">Budget {formatCurrency(budget)}</span>
                        <span className={cn('font-medium tabular-nums', ratio >= 1 ? 'text-negative' : ratio >= 0.7 ? 'text-warning' : 'text-positive')}>
                            {ratio >= 1
                                ? `Over by ${formatCurrency(total - budget)}`
                                : `${formatCurrency(budget - total)} left`}
                        </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-line-soft overflow-hidden">
                        <div
                            className={cn('h-full rounded-full', ratio >= 1 ? 'bg-negative' : ratio >= 0.7 ? 'bg-warning' : 'bg-brand')}
                            style={{ width: `${Math.min(100, ratio * 100)}%` }}
                        />
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-subtle-ink tabular-nums">{Math.round(ratio * 100)}% used</p>
                </div>
            )}

            {hasActivePeriod && (
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line-soft bg-line-soft">
                    <div className="bg-surface p-3">
                        <p className="text-[11px] text-muted-ink">Transactions</p>
                        <p className="text-[15px] font-medium text-ink tabular-nums mt-1">{transactions.length}</p>
                    </div>
                    <div className="bg-surface p-3">
                        <p className="text-[11px] text-muted-ink">Average each</p>
                        <p className="text-[15px] font-medium text-ink tabular-nums mt-1">{formatCurrency(average)}</p>
                    </div>
                </div>
            )}

            <QuickAmountsEditor category={category} />

            <div className="rounded-[20px] border border-line overflow-hidden">
                <p className="px-4 pt-3 pb-2 text-[11px] uppercase tracking-[.14em] text-muted-ink">Recent this period</p>
                {recent.length === 0 ? (
                    <p className="px-4 pb-3 text-[12px] text-muted-ink">No transactions in this category yet.</p>
                ) : (
                    <ul className="divide-y divide-line-soft border-t border-line-soft">
                        {recent.map(tx => (
                            <li key={tx.id} className="flex items-center gap-2.5 px-4 py-2">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12.5px] font-medium text-ink">{tx.note || category.name}</p>
                                    <p className="text-[10.5px] text-subtle-ink">{formatDateShort(tx.date)} · {tx.account.name}</p>
                                </div>
                                <p className={cn('text-[12.5px] tabular-nums shrink-0', isIncome ? 'text-positive' : 'text-ink')}>
                                    {isIncome ? '+' : '−'}{formatCurrency(tx.amount)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex items-center justify-center gap-6 pt-1">
                <button type="button" onClick={onEdit} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-ink py-2">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-negative py-2">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
            </div>
        </div>
    )
}
