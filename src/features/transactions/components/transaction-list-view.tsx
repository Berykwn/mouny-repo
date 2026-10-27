import { useMemo, useState } from 'react'
import { Trash2, Tag, Download, X, Search, ListChecks } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'
import { toCsv, downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import type { TransactionWithDetails, TransactionType } from '@/types'
import {
    applyFilter, categoryFacets, dayNet, groupByDate, matchSummary, pairTransfers, txTitle, type TypeFilter,
} from '../lib/ledger'
import { useIsDesktop } from '../lib/use-is-desktop'
import { dayLabel, formatNet, rowMeta } from '../lib/row-format'
import { DayHeader, LedgerRowBody } from './ledger-row'

interface TransactionListViewProps {
    transactions: TransactionWithDetails[]
    selectedIds: string[]
    onSelectedIdsChange: (ids: string[]) => void
    readOnly?: boolean
    /** Tapping a row (outside select mode on a phone) opens its detail. */
    onOpen: (tx: TransactionWithDetails) => void
    /** The row whose detail is open beside the list, on a wide screen. */
    openId?: string | null
    onBulkDeleteRequest: () => void
    onBulkCategoryRequest: () => void
    /** The CSV's file name, naming the period it came from. */
    exportName: string
}

const TYPE_CHIPS: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'expense', label: 'Expenses' },
    { key: 'income', label: 'Income' },
    { key: 'transfer', label: 'Transfers' },
]

const CHIP = 'shrink-0 h-8 px-3.5 rounded-full text-[12.5px] font-medium border transition-colors'
const CHIP_ON = 'bg-ink text-on-ink border-ink'
const CHIP_OFF = 'bg-surface text-muted-ink border-line hover:text-ink'
const ICON_BTN = 'w-11 h-11 shrink-0 rounded-[14px] bg-surface-hover flex items-center justify-center text-muted-ink hover:text-ink transition-colors disabled:opacity-40'
const BAR_BTN = 'flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-[10px] text-[12.5px] font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none'

export function TransactionListView({
    transactions,
    selectedIds,
    onSelectedIdsChange,
    readOnly,
    onOpen,
    openId,
    onBulkDeleteRequest,
    onBulkCategoryRequest,
    exportName,
}: TransactionListViewProps) {
    const [query, setQuery] = useState('')
    const [type, setType] = useState<TypeFilter>('all')
    const [categoryId, setCategoryId] = useState<string | null>(null)
    const [selectMode, setSelectMode] = useState(false)
    const isDesktop = useIsDesktop()

    // A wide screen always has a checkbox column; a phone asks first, so a tap opens a row.
    const canSelect = !readOnly
    const selecting = canSelect && (selectMode || selectedIds.length > 0)
    const tapSelects = selecting && !isDesktop

    // A transfer is one row here; its two sides still go to the CSV.
    const { rows, otherSide } = useMemo(() => pairTransfers(transactions), [transactions])

    // Category chips follow the type filter, so "Income" only offers income categories.
    const facets = useMemo(
        () => type === 'transfer' ? [] : categoryFacets(type === 'all' ? rows : rows.filter(t => t.type === type)),
        [rows, type]
    )
    const filter = { query, type, categoryId }
    const filtered = useMemo(
        () => applyFilter(rows, { query, type, categoryId }),
        [rows, query, type, categoryId]
    )
    const groups = useMemo(() => groupByDate(filtered), [filtered])
    const searching = !!query.trim()
    const isFiltered = searching || type !== 'all' || !!categoryId
    const summary = matchSummary(filtered)

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
        downloadCsv(exportName, toCsv(selectedTxs.length > 0 ? selectedTxs : applyFilter(transactions, filter)))
    }

    const clearFilters = () => {
        setQuery('')
        setType('all')
        setCategoryId(null)
    }

    const renderRow = (tx: TransactionWithDetails, withDate: boolean) => {
        const selected = selectedIds.includes(tx.id)
        const open = !tapSelects && openId === tx.id
        return (
            <div
                key={tx.id}
                className={cn(
                    'flex items-center gap-3 -mx-2 px-2 rounded-[12px] transition-colors',
                    selected ? 'bg-brand-tint' : open ? 'bg-surface-hover' : 'hover:bg-surface-soft',
                )}
            >
                {canSelect && (
                    <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggle(tx.id)}
                        aria-label={`Select ${txTitle(tx)}`}
                        className={cn(!selecting && 'hidden lg:inline-flex')}
                    />
                )}
                <button
                    type="button"
                    onClick={() => tapSelects ? toggle(tx.id) : onOpen(tx)}
                    aria-pressed={tapSelects ? selected : undefined}
                    aria-current={open ? 'true' : undefined}
                    className="flex-1 min-w-0 flex items-center gap-3 py-3 text-left border-b border-line-soft"
                >
                    <LedgerRowBody tx={tx} meta={rowMeta(tx, { otherSide: otherSide.get(tx.id), withDate })} />
                </button>
            </div>
        )
    }

    return (
        <div className={cn('space-y-3', selecting && 'pb-20')}>
            {/* Search + tools */}
            <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center gap-2.5 h-11 px-3.5 rounded-[14px] bg-surface-hover border border-transparent focus-within:border-line-strong transition-colors">
                    <Search aria-hidden="true" className="w-[18px] h-[18px] text-muted-ink shrink-0" />
                    <input
                        type="search"
                        aria-label="Search transactions"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search your notes"
                        className="flex-1 min-w-0 bg-transparent outline-none text-[16px] lg:text-[14px] text-ink placeholder:text-muted-ink [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                        <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="text-muted-ink hover:text-ink">
                            <X aria-hidden="true" className="w-4 h-4" />
                        </button>
                    )}
                </label>
                <button
                    type="button"
                    title="Export CSV"
                    aria-label={selectedTxs.length > 0 ? `Export ${selectedTxs.length} selected as CSV` : 'Export as CSV'}
                    onClick={handleExport}
                    disabled={filtered.length === 0}
                    className={ICON_BTN}
                >
                    <Download aria-hidden="true" className="w-[18px] h-[18px]" />
                </button>
                {canSelect && (
                    <button
                        type="button"
                        onClick={() => selecting ? exitSelect() : setSelectMode(true)}
                        aria-label={selecting ? 'Done selecting' : 'Select transactions'}
                        aria-pressed={selecting}
                        className={cn(ICON_BTN, 'lg:hidden', selecting && 'bg-ink text-on-ink hover:text-on-ink')}
                    >
                        <ListChecks aria-hidden="true" className="w-[18px] h-[18px]" />
                    </button>
                )}
            </div>

            {/* Filters: type, then the categories in play */}
            <div data-no-swipe role="group" aria-label="Filter" className="flex gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
                {TYPE_CHIPS.map(t => (
                    <button
                        key={t.key}
                        type="button"
                        aria-pressed={type === t.key}
                        onClick={() => { setType(t.key); setCategoryId(null) }}
                        className={cn(CHIP, type === t.key ? CHIP_ON : CHIP_OFF)}
                    >
                        {t.label}
                    </button>
                ))}
                {facets.length > 1 && <span aria-hidden className="shrink-0 w-px my-1.5 bg-line" />}
                {facets.length > 1 && facets.map(f => (
                    <button
                        key={f.id}
                        type="button"
                        aria-pressed={categoryId === f.id}
                        onClick={() => setCategoryId(categoryId === f.id ? null : f.id)}
                        className={cn(CHIP, categoryId === f.id ? CHIP_ON : CHIP_OFF)}
                    >
                        {f.name} <span className={cn('tabular-nums', categoryId === f.id ? 'text-on-ink/60' : 'text-muted-ink')}>{f.count}</span>
                    </button>
                ))}
            </div>

            {/* The one summary line: how many times, and how much */}
            {isFiltered && filtered.length > 0 && (
                <p aria-live="polite" className="flex items-baseline justify-between gap-3 pt-1 text-[13px] text-muted-ink">
                    <span className="min-w-0 tabular-nums">
                        <span className="font-semibold text-ink">
                            {summary.count} time{summary.count === 1 ? '' : 's'}
                            {summary.out > 0 && <> · {formatCurrency(summary.out)}</>}
                        </span>
                        {summary.income > 0 && <span className="text-brand"> · +{formatCurrency(summary.income)} in</span>}
                        {' '}this period
                    </span>
                    <button type="button" onClick={clearFilters} className="shrink-0 text-[12.5px] font-medium text-brand hover:underline">Clear</button>
                </p>
            )}

            {transactions.length === 0 ? (
                <p className="text-[13px] text-muted-ink py-10 text-center">No transactions this period.</p>
            ) : filtered.length === 0 ? (
                <div className="py-10 text-center">
                    <p className="text-[13px] text-muted-ink">
                        {searching ? `No notes match “${query.trim()}” this period.` : 'Nothing matches these filters.'}
                    </p>
                    <button type="button" onClick={clearFilters} className="mt-2 text-[12.5px] font-medium text-brand hover:underline">Clear filters</button>
                </div>
            ) : searching ? (
                // Search results read as one list, each row with its own day.
                <section aria-label="Results">
                    <DayHeader label="Results">{filtered.length}</DayHeader>
                    {filtered.map(tx => renderRow(tx, true))}
                </section>
            ) : (
                groups.map(group => {
                    const net = dayNet(group)
                    return (
                        <section key={group.date} aria-label={dayLabel(group.date)}>
                            <DayHeader label={dayLabel(group.date)}>{net !== 0 ? formatNet(net) : null}</DayHeader>
                            {group.txs.map(tx => renderRow(tx, false))}
                        </section>
                    )
                })
            )}

            {/* Bulk actions float over the list while anything is selected */}
            {canSelect && selecting && (
                <div
                    role="toolbar"
                    aria-label="Selected transactions"
                    className="fixed z-30 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] bottom-[calc(88px+env(safe-area-inset-bottom))] lg:bottom-6 flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-[16px] bg-ink text-on-ink shadow-[0_10px_30px_rgba(0,0,0,.18)] max-w-[calc(100vw-24px)]"
                >
                    <Checkbox
                        aria-label={allSelected ? 'Deselect all shown' : 'Select all shown'}
                        checked={allSelected ? true : selectedIds.length > 0 ? 'indeterminate' : false}
                        onCheckedChange={toggleAll}
                        className="border-on-ink/40 bg-transparent"
                    />
                    <p className="px-2 text-[13px] font-semibold whitespace-nowrap tabular-nums">
                        {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select'}
                    </p>
                    <button
                        type="button"
                        disabled={!commonType}
                        title={!commonType ? 'Select transactions of only one type' : 'Change category'}
                        aria-label={!commonType ? 'Change category (select transactions of only one type)' : 'Change category'}
                        onClick={onBulkCategoryRequest}
                        className={cn(BAR_BTN, 'bg-on-ink/10 hover:bg-on-ink/15')}
                    >
                        <Tag aria-hidden="true" className="w-4 h-4" /> <span className="hidden sm:inline">Change category</span>
                    </button>
                    <button
                        type="button"
                        aria-label={`Export ${selectedIds.length} selected as CSV`}
                        disabled={selectedIds.length === 0}
                        onClick={handleExport}
                        className={cn(BAR_BTN, 'bg-on-ink/10 hover:bg-on-ink/15')}
                    >
                        <Download aria-hidden="true" className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        type="button"
                        aria-label={`Delete ${selectedIds.length} selected`}
                        disabled={selectedIds.length === 0}
                        onClick={onBulkDeleteRequest}
                        className={cn(BAR_BTN, 'bg-negative text-white hover:bg-negative/90')}
                    >
                        <Trash2 aria-hidden="true" className="w-4 h-4" /> <span className="hidden sm:inline">Delete</span>
                    </button>
                    <button
                        type="button"
                        aria-label="Done selecting"
                        onClick={exitSelect}
                        className="flex items-center justify-center w-9 h-9 rounded-[10px] text-on-ink/70 hover:text-on-ink transition-colors"
                    >
                        <X aria-hidden="true" className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    )
}
