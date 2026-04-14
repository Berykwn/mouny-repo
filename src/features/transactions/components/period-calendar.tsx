import { useState } from 'react'
import { formatCurrency } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'
import { TrendingUp, TrendingDown, Trash2, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface PeriodCalendarProps {
    transactions: TransactionWithDetails[]
    periodStart: string
    periodEnd: string
    defaultDate?: string
    onDeleteRequest?: (id: string) => void
    readOnly?: boolean
    periodLabel: string
    isCurrentPeriod: boolean
    canGoPrev: boolean
    canGoNext: boolean
    onPrevPeriod: () => void
    onNextPeriod: () => void
    onOpenPicker: () => void     // ← buka period picker drawer
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDateLocal(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function getDatesInRange(start: string, end: string): string[] {
    const dates: string[] = []
    const cur = new Date(start + 'T00:00:00')
    const last = new Date(end + 'T00:00:00')
    while (cur <= last) {
        dates.push(formatDateLocal(cur))
        cur.setDate(cur.getDate() + 1)
    }
    return dates
}

function heatColor(ratio: number): string {
    if (ratio >= 0.8) return 'bg-red-500 text-white'
    if (ratio >= 0.6) return 'bg-red-300 text-red-900 dark:bg-red-700 dark:text-red-100'
    if (ratio >= 0.4) return 'bg-amber-300 text-amber-900 dark:bg-amber-700 dark:text-amber-100'
    if (ratio >= 0.2) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
    return 'bg-muted text-muted-foreground'
}

function DayTransactions({
    txs,
    onDeleteRequest,
    readOnly,
}: {
    txs: TransactionWithDetails[]
    onDeleteRequest?: (id: string) => void
    readOnly?: boolean
}) {
    return (
        <div className="space-y-1.5">
            {txs.map(tx => {
                const title = tx.note || tx.category?.name || (tx.type === 'income' ? 'Income' : 'Expense')
                const subtitle = [
                    tx.category?.name && tx.note ? tx.category.name : null,
                    tx.account.name,
                ].filter(Boolean).join(' · ')

                return (
                    <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                        <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                            tx.type === 'income' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                        )}>
                            {tx.type === 'income'
                                ? <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                : <TrendingDown className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{title}</p>
                            {subtitle && (
                                <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <p className={cn(
                                'text-xs font-bold',
                                tx.type === 'income' ? 'text-green-600' : 'text-foreground'
                            )}>
                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </p>
                            {!readOnly && onDeleteRequest && (
                                <button
                                    onClick={() => onDeleteRequest(tx.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export function PeriodCalendar({
    transactions,
    periodStart,
    periodEnd,
    defaultDate,
    onDeleteRequest,
    readOnly,
    periodLabel,
    isCurrentPeriod,
    canGoPrev,
    canGoNext,
    onPrevPeriod,
    onNextPeriod,
    onOpenPicker,
}: PeriodCalendarProps) {
    const clampDefault = () => {
        const d = defaultDate ?? periodStart
        if (d < periodStart) return periodStart
        if (d > periodEnd) return periodEnd
        return d
    }

    const [selectedDate, setSelectedDate] = useState<string>(clampDefault())

    const validSelected = selectedDate < periodStart || selectedDate > periodEnd
        ? clampDefault()
        : selectedDate

    // Group by date
    const txByDate = new Map<string, TransactionWithDetails[]>()
    for (const tx of transactions) {
        if (!txByDate.has(tx.date)) txByDate.set(tx.date, [])
        txByDate.get(tx.date)!.push(tx)
    }

    // Daily expense for heatmap
    const dailyExpense = new Map<string, number>()
    for (const [date, txs] of txByDate) {
        dailyExpense.set(date, txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
    }
    const maxExpense = Math.max(0, ...dailyExpense.values())

    // Calendar grid
    const dates = getDatesInRange(periodStart, periodEnd)
    const firstDayOfWeek = new Date(periodStart + 'T00:00:00').getDay()
    const paddedDates: (string | null)[] = [...Array(firstDayOfWeek).fill(null), ...dates]
    const remainder = paddedDates.length % 7
    if (remainder !== 0) paddedDates.push(...Array(7 - remainder).fill(null))

    const selectedTxs = txByDate.get(validSelected) ?? []
    const dailyTotal = selectedTxs.reduce((sum, tx) =>
        tx.type === 'income' ? sum + tx.amount : sum - tx.amount, 0)

    return (
        <div className="space-y-3">
            <div className="rounded-xl border bg-card p-4 space-y-4">

                {/* Period navigator */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onPrevPeriod}
                        disabled={!canGoPrev}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Center — tappable to open picker */}
                    <button
                        onClick={onOpenPicker}
                        className="flex-1 flex flex-col items-center gap-1 py-1 rounded-lg hover:bg-accent transition-colors"
                    >
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold">{periodLabel}</p>
                            <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />
                        </div>
                        {isCurrentPeriod && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                                Active
                            </Badge>
                        )}
                    </button>

                    <button
                        onClick={onNextPeriod}
                        disabled={!canGoNext}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Heatmap legend */}
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Spending calendar
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>low</span>
                        <div className="flex gap-0.5">
                            {['bg-muted', 'bg-amber-100', 'bg-amber-300', 'bg-red-300', 'bg-red-500'].map((c, i) => (
                                <div key={i} className={cn('w-3 h-3 rounded-sm', c)} />
                            ))}
                        </div>
                        <span>high</span>
                    </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1">
                    {DAY_LABELS.map(d => (
                        <div key={d} className="text-[10px] text-center text-muted-foreground font-medium py-1">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                    {paddedDates.map((date, i) => {
                        if (!date) return <div key={`pad-${i}`} className="aspect-square" />

                        const dayNum = new Date(date + 'T00:00:00').getDate()
                        const expense = dailyExpense.get(date) ?? 0
                        const hasTx = txByDate.has(date)
                        const isSelected = validSelected === date
                        const ratio = maxExpense > 0 ? expense / maxExpense : 0

                        const d = new Date(date + 'T00:00:00')
                        const showMonth = dayNum === 1 && date !== periodStart

                        return (
                            <div key={date} className="relative">
                                {showMonth && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground/60 whitespace-nowrap">
                                        {d.toLocaleDateString('en-GB', { month: 'short' })}
                                    </div>
                                )}
                                <button
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        'w-full aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition-all',
                                        isSelected ? 'ring-2 ring-foreground ring-offset-1 scale-105 z-10 relative' : 'hover:opacity-80',
                                        hasTx ? heatColor(ratio) : 'text-muted-foreground/40'
                                    )}
                                >
                                    {dayNum}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Selected day detail */}
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">
                        {new Date(validSelected + 'T00:00:00').toLocaleDateString('en-GB', {
                            weekday: 'long', day: 'numeric', month: 'long'
                        })}
                    </p>
                    {selectedTxs.length > 0 && (
                        <p className={cn(
                            'text-xs font-semibold',
                            dailyTotal >= 0 ? 'text-green-600' : 'text-destructive'
                        )}>
                            {dailyTotal >= 0 ? '+' : ''}{formatCurrency(dailyTotal)}
                        </p>
                    )}
                </div>
                {selectedTxs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No transactions this day.</p>
                ) : (
                    <DayTransactions
                        txs={selectedTxs}
                        onDeleteRequest={onDeleteRequest}
                        readOnly={readOnly}
                    />
                )}
            </div>
        </div>
    )
}