import { TrendingUp, TrendingDown, Trash2, Tag, Download, X } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/helpers'
import { toCsv, downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { CategoryIcon } from '@/features/categories/components/category-icon'
import type { TransactionWithDetails, TransactionType } from '@/types'

interface TransactionListViewProps {
    transactions: TransactionWithDetails[]
    selectedIds: string[]
    onSelectedIdsChange: (ids: string[]) => void
    readOnly?: boolean
    onBulkDeleteRequest: () => void
    onBulkCategoryRequest: () => void
}

export function TransactionListView({
    transactions,
    selectedIds,
    onSelectedIdsChange,
    readOnly,
    onBulkDeleteRequest,
    onBulkCategoryRequest,
}: TransactionListViewProps) {
    const selectedTxs = transactions.filter(tx => selectedIds.includes(tx.id))
    const selectedTypes = new Set(selectedTxs.map(tx => tx.type))
    const commonType = (selectedTypes.size === 1 ? selectedTxs[0].type : null) as TransactionType | null

    const allSelected = transactions.length > 0 && selectedIds.length === transactions.length
    const someSelected = selectedIds.length > 0 && !allSelected

    const toggle = (id: string) => {
        onSelectedIdsChange(
            selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
        )
    }

    const toggleAll = () => {
        onSelectedIdsChange(allSelected ? [] : transactions.map(tx => tx.id))
    }

    const handleExport = () => {
        downloadCsv('transactions.csv', toCsv(selectedTxs.length > 0 ? selectedTxs : transactions))
    }

    return (
        <div className="card overflow-hidden">
            {!readOnly && selectedIds.length > 0 && (
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-surface-hover border-b border-line">
                    <p className="text-[13px] font-medium text-ink">{selectedIds.length} selected</p>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={!commonType}
                            title={!commonType ? 'Select transactions of only one type' : 'Change category'}
                            onClick={onBulkCategoryRequest}
                            className="flex items-center gap-1.5 px-2 sm:px-2.5 h-8 rounded-[10px] text-[12px] font-medium text-ink hover:bg-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        >
                            <Tag className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Change category</span>
                        </button>
                        <button
                            type="button"
                            title="Export"
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-2 sm:px-2.5 h-8 rounded-[10px] text-[12px] font-medium text-ink hover:bg-white transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span>
                        </button>
                        <button
                            type="button"
                            title="Delete"
                            onClick={onBulkDeleteRequest}
                            className="flex items-center gap-1.5 px-2 sm:px-2.5 h-8 rounded-[10px] text-[12px] font-medium text-negative hover:bg-white transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Delete</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onSelectedIdsChange([])}
                            className="flex items-center justify-center w-8 h-8 rounded-[10px] text-muted-ink hover:bg-white transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-line bg-surface-soft">
                {!readOnly && (
                    <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleAll}
                    />
                )}
                <p className="hidden lg:block w-[64px] shrink-0 text-[10px] uppercase tracking-[.1em] text-muted-ink">Date</p>
                <p className="flex-1 text-[10px] uppercase tracking-[.1em] text-muted-ink">Details</p>
                <p className="hidden lg:block w-[120px] shrink-0 text-[10px] uppercase tracking-[.1em] text-muted-ink">Account</p>
                <p className="w-[90px] lg:w-[110px] shrink-0 text-right text-[10px] uppercase tracking-[.1em] text-muted-ink">Amount</p>
            </div>

            {transactions.length === 0 ? (
                <p className="text-[13px] text-muted-ink px-4 py-6 text-center">No transactions this period.</p>
            ) : (
                <div>
                    {transactions.map(tx => {
                        const title = tx.note || tx.category?.name || (tx.type === 'income' ? 'Income' : 'Expense')
                        const subtitle = tx.category?.name && tx.note ? tx.category.name : null
                        const mobileSubtitle = [formatDateShort(tx.date), tx.account.name, subtitle].filter(Boolean).join(' · ')
                        const selected = selectedIds.includes(tx.id)

                        return (
                            <div
                                key={tx.id}
                                onClick={() => !readOnly && toggle(tx.id)}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-2.5 border-b border-line-soft last:border-b-0',
                                    !readOnly && 'cursor-pointer hover:bg-surface-soft transition-colors',
                                    selected && 'bg-brand/10'
                                )}
                            >
                                {!readOnly && (
                                    <Checkbox checked={selected} onCheckedChange={() => toggle(tx.id)} onClick={(e) => e.stopPropagation()} />
                                )}
                                <p className="hidden lg:block w-[64px] shrink-0 text-[12px] text-muted-ink">{formatDateShort(tx.date)}</p>
                                <div className="flex-1 min-w-0 flex items-center gap-2.5">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `${tx.category?.color ?? '#e5e7eb'}25` }}
                                    >
                                        {tx.category ? (
                                            <CategoryIcon
                                                name={tx.category.icon}
                                                className="w-[15px] h-[15px]"
                                                style={{ color: tx.category.color ?? '#6b7280' }}
                                            />
                                        ) : tx.type === 'income' ? (
                                            <TrendingUp className="w-3.5 h-3.5 text-positive" />
                                        ) : (
                                            <TrendingDown className="w-3.5 h-3.5 text-negative" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-ink truncate">{title}</p>
                                        <p className="lg:hidden text-[11px] text-muted-ink truncate">{mobileSubtitle}</p>
                                        {subtitle && <p className="hidden lg:block text-[11px] text-muted-ink truncate">{subtitle}</p>}
                                    </div>
                                </div>
                                <p className="hidden lg:block w-[120px] shrink-0 text-[12px] text-muted-ink truncate">{tx.account.name}</p>
                                <p className={cn(
                                    'w-[90px] lg:w-[110px] shrink-0 text-right text-[13px] font-medium',
                                    tx.type === 'income' ? 'text-positive' : 'text-ink'
                                )}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
