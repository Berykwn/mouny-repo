import { useState } from 'react'
import { formatCurrency } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'
import { TrendingUp, TrendingDown, Trash2, ChevronLeft, ChevronRight, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CategoryIcon } from '@/features/categories/components/category-icon'

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
    onOpenPicker: () => void
    onDateSelect?: (date: string) => void
    onAddTransaction?: () => void
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
        <div className="border-t border-neutral-200">
            {txs.map(tx => {
                const title = tx.note || tx.category?.name || (tx.type === 'income' ? 'Income' : 'Expense')
                const subtitle = [
                    tx.category?.name && tx.note ? tx.category.name : null,
                    tx.account.name,
                ].filter(Boolean).join(' · ')

                return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-200 last:border-b-0">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                                backgroundColor: `${tx.category?.color ?? '#e5e7eb'}25`,
                            }}
                        >
                            {tx.category?.icon ? (
                                <CategoryIcon
                                    name={tx.category.icon}
                                    className="w-[15px] h-[15px]"
                                    style={{
                                        color: tx.category.color ?? '#6b7280',
                                    }}
                                />
                            ) : tx.type === 'income' ? (
                                <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                            ) : (
                                <TrendingDown className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                            )}
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
    onDateSelect,
    onAddTransaction,
}: PeriodCalendarProps) {
    const clamp = (d: string) => {
        if (d < periodStart) return periodStart
        if (d > periodEnd) return periodEnd
        return d
    }

    const [selectedDate, setSelectedDate] = useState<string>(clamp(defaultDate ?? periodStart))

    const validSelected = clamp(selectedDate)

    const txByDate = new Map<string, TransactionWithDetails[]>()
    for (const tx of transactions) {
        if (!txByDate.has(tx.date)) txByDate.set(tx.date, [])
        txByDate.get(tx.date)!.push(tx)
    }

    const dailyExpense = new Map<string, number>()
    for (const [date, txs] of txByDate) {
        dailyExpense.set(date, txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
    }
    const maxExpense = Math.max(0, ...dailyExpense.values())

    const dates = getDatesInRange(periodStart, periodEnd)
    const firstDayOfWeek = new Date(periodStart + 'T00:00:00').getDay()
    const paddedDates: (string | null)[] = [...Array(firstDayOfWeek).fill(null), ...dates]
    const remainder = paddedDates.length % 7
    if (remainder !== 0) paddedDates.push(...Array(7 - remainder).fill(null))

    const selectedTxs = (txByDate.get(validSelected) ?? [])
        .slice()
        .sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
            return aTime - bTime
        })

    const dailyIncomeSummary = selectedTxs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0)
    const dailyExpenseSummary = dailyExpense.get(validSelected) ?? 0
    // const dailyTotal = dailyIncomeSummary - dailyExpenseSummary

    const handleSelectDate = (date: string) => {
        setSelectedDate(date)
        onDateSelect?.(date)
    }

    return (
        <div className="space-y-3 pt-3">
            <div className="rounded-2xl border border-neutral-200 bg-card p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onPrevPeriod}
                        disabled={!canGoPrev}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                        onClick={onOpenPicker}
                        className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg hover:bg-accent transition-colors"
                    >
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold">{periodLabel}</p>
                            <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />
                        </div>
                        {isCurrentPeriod && (
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">
                                Active
                            </span>
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

                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
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

                <div className="grid grid-cols-7 gap-1">
                    {DAY_LABELS.map(d => (
                        <div key={d} className="text-[10px] text-center text-muted-foreground font-medium py-1">
                            {d}
                        </div>
                    ))}
                </div>

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
                                    onClick={() => handleSelectDate(date)}
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

                {onAddTransaction && (
                    <>
                        <div className="border-t border-neutral-200" />
                        <Button
                            variant="outline"
                            className="w-full h-12 rounded-xl text-sm font-semibold"
                            onClick={onAddTransaction}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Transaction
                        </Button>
                    </>
                )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-card">
                <div className="flex items-center justify-between p-4">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                        {new Date(validSelected + 'T00:00:00').toLocaleDateString('en-GB', {
                            weekday: 'long', day: 'numeric', month: 'long'
                        })}
                    </p>

                    {selectedTxs.length > 0 && (
                        // <p className={cn(
                        //     'text-xs font-semibold',
                        //     dailyTotal >= 0 ? 'text-green-600' : 'text-destructive'
                        // )}>
                        //     {dailyTotal >= 0 ? '+' : ''}{formatCurrency(dailyTotal)}
                        // </p>
                        <div className='flex gap-x-1.5'>
                            <p className='text-xs font-semibold text-green-600'>+ {formatCurrency(dailyIncomeSummary)}</p>
                            <p className='text-xs font-semibold text-destructive'>- {formatCurrency(dailyExpenseSummary)}</p>
                            {/* <p className='text-xs font-semibold'> {formatCurrency(dailyTotal)}</p> */}
                        </div>
                    )}
                </div>

                {selectedTxs.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 pb-4">No transactions this day.</p>
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