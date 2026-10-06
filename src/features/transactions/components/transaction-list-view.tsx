import { useMemo, useState } from 'react'
import { Trash2, Tag, Download, X, Search, ListChecks } from 'lucide-react'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { amountColor, amountSign } from '@/lib/transaction-type'
import { TypeIcon } from './type-icon'
import { toCsv, downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { CategoryTile } from '@/features/categories/components/category-icon'
import type { TransactionWithDetails, TransactionType } from '@/types'
import { applyFilter, categoryFacets, groupByDate, txTitle, type TypeFilter } from '../lib/ledger'

interface TransactionListViewProps {
    transactions: TransactionWithDetails[]
    selectedIds: string[]
    onSelectedIdsChange: (ids: string[]) => void
    readOnly?: boolean
    /** Tapping a row outside select mode opens its detail sheet. */
    onOpen: (tx: TransactionWithDetails) => void
    onBulkDeleteRequest: () => void
    onBulkCategoryRequest: () => void
}

const CHIP = 'shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors'
const CHIP_ON = 'bg-ink text-on-ink border-ink'
const CHIP_OFF = 'bg-surface text-muted-ink border-line hover:text-ink'
const TOOL_BTN = 'flex items-center gap-1.5 px-2 sm:px-2.5 h-8 rounded-[10px] text-[12px] font-medium transition-colors'

function dayLabel(date: string): string {
    const d = new Date(date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function TransactionListView({
    transactions,
    selectedIds,
    onSelectedIdsChange,
    readOnly,
    onOpen,
    onBulkDeleteRequest,
    onBulkCategoryRequest,
}: TransactionListViewProps) {
    const [query, setQuery] = useState('')
    const [type, setType] = useState<TypeFilter>('all')
    const [categoryId, setCategoryId] = useState<string | null>(null)
    const [selectMode, setSelectMode] = useState(false)

    const selecting = !readOnly && (selectMode || selectedIds.length > 0)

    // Category chips follow the type filter, so "Income" only offers income categories.
    const facets = useMemo(
        () => categoryFacets(type === 'all' ? transactions : transactions.filter(t => t.type === type)),
        [transactions, type]
    )
    const filtered = useMemo(
        () => applyFilter(transactions, { query, type, categoryId }),
        [transactions, query, type, categoryId]
    )
    const groups = useMemo(() => groupByDate(filtered), [filtered])
    const filteredIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const filteredExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const isFiltered = !!query.trim() || type !== 'all' || !!categoryId

    const selectedTxs = transactions.filter(tx => selectedIds.includes(tx.id))
    const selectedTypes = new Set(selectedTxs.map(tx => tx.type))
    const commonType = (selectedTypes.size === 1 ? selectedTxs[0].type : null) as TransactionType | null

    const allSelected = filtered.length > 0 && filtered.every(tx => selectedIds.includes(tx.id))

    const toggle = (id: string) => {
        onSelectedIdsChange(
            selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
        )
    }

    const toggleAll = () => {
        const ids = new Set(filtered.map(tx => tx.id))
        onSelectedIdsChange(allSelected
            ? selectedIds.filter(id => !ids.has(id))
            : [...new Set([...selectedIds, ...ids])])
    }

    const exitSelect = () => {
        onSelectedIdsChange([])
        setSelectMode(false)
    }

    const handleExport = () => {
        downloadCsv('transactions.csv', toCsv(selectedTxs.length > 0 ? selectedTxs : filtered))
    }

    const clearFilters = () => {
        setQuery('')
        setType('all')
        setCategoryId(null)
    }

    return (
        <div className="space-y-3 pt-3">
            {/* Search + tools */}
            <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center gap-2 h-10 px-3 rounded-[12px] border border-line bg-surface focus-within:border-ink/40 transition-colors">
                    <Search className="w-4 h-4 text-subtle-ink shrink-0" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search note, category, account"
                        className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-ink placeholder:text-subtle-ink"
                    />
                    {query && (
                        <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="text-subtle-ink hover:text-ink">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </label>
                <button
                    type="button"
                    title="Export CSV"
                    onClick={handleExport}
                    disabled={filtered.length === 0}
                    className="w-10 h-10 rounded-[12px] border border-line bg-surface flex items-center justify-center text-muted-ink hover:text-ink transition-colors disabled:opacity-40"
                >
                    <Download className="w-4 h-4" />
                </button>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={() => selecting ? exitSelect() : setSelectMode(true)}
                        className={cn(
                            'h-10 px-3 rounded-[12px] border flex items-center gap-1.5 text-[12px] font-medium transition-colors',
                            selecting ? 'bg-ink text-on-ink border-ink' : 'bg-surface text-ink border-line hover:bg-surface-soft'
                        )}
                    >
                        <ListChecks className="w-4 h-4" />
                        <span className="hidden sm:inline">{selecting ? 'Done' : 'Select'}</span>
                    </button>
                )}
            </div>

            {/* Filters: type, then the categories in play */}
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
                {(['all', 'expense', 'income'] as TypeFilter[]).map(t => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => { setType(t); setCategoryId(null) }}
                        className={cn(CHIP, type === t ? CHIP_ON : CHIP_OFF)}
                    >
                        {t === 'all' ? 'All' : t === 'expense' ? 'Expense' : 'Income'}
                    </button>
                ))}
                {facets.length > 1 && <span aria-hidden className="shrink-0 w-px my-1.5 bg-line" />}
                {facets.length > 1 && facets.map(f => (
                    <button
                        key={f.id}
                        type="button"
                        onClick={() => setCategoryId(categoryId === f.id ? null : f.id)}
                        className={cn(CHIP, categoryId === f.id ? CHIP_ON : CHIP_OFF)}
                    >
                        {f.name} <span className={cn('tabular-nums', categoryId === f.id ? 'text-on-ink/60' : 'text-subtle-ink')}>{f.count}</span>
                    </button>
                ))}
            </div>

            <div className="card overflow-hidden">
                {selecting ? (
                    <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2.5 bg-surface-hover border-b border-line">
                        <Checkbox checked={allSelected ? true : selectedIds.length > 0 ? 'indeterminate' : false} onCheckedChange={toggleAll} />
                        <p className="flex-1 text-[13px] font-medium text-ink">
                            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select transactions'}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={!commonType}
                                title={!commonType ? 'Select transactions of only one type' : 'Change category'}
                                onClick={onBulkCategoryRequest}
                                className={cn(TOOL_BTN, 'text-ink hover:bg-surface disabled:opacity-40 disabled:pointer-events-none')}
                            >
                                <Tag className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Category</span>
                            </button>
                            <button
                                type="button"
                                title="Delete"
                                disabled={selectedIds.length === 0}
                                onClick={onBulkDeleteRequest}
                                className={cn(TOOL_BTN, 'text-negative hover:bg-surface disabled:opacity-40 disabled:pointer-events-none')}
                            >
                                <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Delete</span>
                            </button>
                            <button
                                type="button"
                                aria-label="Done selecting"
                                onClick={exitSelect}
                                className="flex items-center justify-center w-8 h-8 rounded-[10px] text-muted-ink hover:bg-surface transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line bg-surface-soft">
                        <p className="text-[11.5px] text-muted-ink">
                            {filtered.length} transaction{filtered.length === 1 ? '' : 's'}
                            {isFiltered && (
                                <button type="button" onClick={clearFilters} className="ml-2 font-medium text-brand hover:underline">Clear filters</button>
                            )}
                        </p>
                        <p className="text-[11.5px] tabular-nums shrink-0">
                            <span className="text-ink">−{formatShortCurrency(filteredExpense)}</span>
                            {filteredIncome > 0 && <span className="text-positive"> · +{formatShortCurrency(filteredIncome)}</span>}
                        </p>
                    </div>
                )}

                {transactions.length === 0 ? (
                    <p className="text-[13px] text-muted-ink px-4 py-8 text-center">No transactions this period.</p>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                        <p className="text-[13px] text-muted-ink">Nothing matches these filters.</p>
                        <button type="button" onClick={clearFilters} className="mt-2 text-[12px] font-medium text-brand hover:underline">Clear filters</button>
                    </div>
                ) : (
                    groups.map(group => (
                        <section key={group.date}>
                            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1.5">
                                <p className="text-[11px] font-medium text-muted-ink">{dayLabel(group.date)}</p>
                                <p className="text-[11px] text-subtle-ink tabular-nums">
                                    {group.expense > 0 && <>−{formatShortCurrency(group.expense)}</>}
                                    {group.expense > 0 && group.income > 0 && ' · '}
                                    {group.income > 0 && <span className="text-positive">+{formatShortCurrency(group.income)}</span>}
                                </p>
                            </div>
                            <div className="divide-y divide-line-soft border-b border-line-soft">
                                {group.txs.map(tx => {
                                    const title = txTitle(tx)
                                    const subtitle = [tx.category?.name && tx.note ? tx.category.name : null, tx.account.name]
                                        .filter(Boolean).join(' · ')
                                    const selected = selectedIds.includes(tx.id)

                                    return (
                                        <button
                                            key={tx.id}
                                            type="button"
                                            onClick={() => selecting ? toggle(tx.id) : onOpen(tx)}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-soft active:bg-surface-hover',
                                                selected && 'bg-brand/10 hover:bg-brand/10'
                                            )}
                                        >
                                            {selecting && (
                                                <Checkbox checked={selected} tabIndex={-1} className="pointer-events-none" />
                                            )}
                                            <CategoryTile category={tx.category}>
                                                {!tx.category && <TypeIcon type={tx.type} />}
                                            </CategoryTile>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-medium text-ink truncate">{title}</p>
                                                <p className="text-[11px] text-muted-ink truncate">{subtitle}</p>
                                            </div>
                                            <p className={cn(
                                                'shrink-0 text-right text-[13px] font-medium tabular-nums',
                                                amountColor(tx.type)
                                            )}>
                                                {amountSign(tx.type)}{formatCurrency(tx.amount)}
                                            </p>
                                        </button>
                                    )
                                })}
                            </div>
                        </section>
                    ))
                )}
            </div>
        </div>
    )
}
