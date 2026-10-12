import { useEffect, useRef, useState } from 'react'
import { formatCurrency, formatCompact, formatShortCurrency, heatBarColor } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'
import { amountColor, amountSign } from '@/lib/transaction-type'
import { cn } from '@/lib/utils'
import { TypeIcon } from './type-icon'
import { CategoryTile } from '@/features/categories/components/category-icon'
import { useLongPress } from '@/hooks/use-long-press'
import {
    dailyEverydaySpending, dailySpending, isOverAllowance, isSaving, latestFirst, txTitle, type DailyAllowance,
} from '../lib/ledger'

interface PeriodCalendarProps {
    transactions: TransactionWithDetails[]
    periodStart: string
    periodEnd: string
    defaultDate?: string
    onDeleteRequest?: (id: string) => void
    readOnly?: boolean
    onDateSelect?: (date: string) => void
    /** Tapping a transaction opens its detail sheet. */
    onOpen?: (tx: TransactionWithDetails) => void
    /** What a day's everyday spending is held against; days past it get a mark. */
    allowance?: DailyAllowance | null
    /** The period's income, which decides what counts as a one-off. */
    periodIncome?: number
}

const allowanceName = (a: DailyAllowance) => a.kind === 'safe' ? 'safe daily amount' : 'everyday share'

function readMode(): CalendarMode {
    try {
        return localStorage.getItem(CALENDAR_MODE_KEY) === 'days' ? 'days' : 'month'
    } catch {
        return 'month'
    }
}

function saveMode(mode: CalendarMode) {
    // Private browsing can refuse storage; the mode just isn't remembered then.
    try { localStorage.setItem(CALENDAR_MODE_KEY, mode) } catch { /* not remembered */ }
}

function dayName(date: string) {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

type CalendarMode = 'month' | 'days'

const CALENDAR_MODE_KEY = 'mouny.calendarMode'
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const BAR_MAX_HEIGHT = 26

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

function rangeLabel(start: string, end: string): string {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    const sMonth = s.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
    const eMonth = e.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
    return sMonth === eMonth
        ? `${s.getDate()} – ${e.getDate()} ${sMonth}`
        : `${s.getDate()} ${sMonth} – ${e.getDate()} ${eMonth}`
}

function barHeight(expense: number, maxExpense: number): number {
    if (expense <= 0) return 0
    const ratio = maxExpense > 0 ? expense / maxExpense : 0
    return Math.max(3, Math.round(ratio * BAR_MAX_HEIGHT))
}

function DayTransactionRow({
    tx,
    onDeleteRequest,
    onOpen,
    deletable,
}: {
    tx: TransactionWithDetails
    onDeleteRequest?: (id: string) => void
    onOpen?: (tx: TransactionWithDetails) => void
    deletable: boolean
}) {
    // Long-press stays as a shortcut to delete; a plain tap opens the detail sheet.
    const longPressHandlers = useLongPress(() => onDeleteRequest?.(tx.id), { onTap: () => onOpen?.(tx) })

    const title = txTitle(tx)
    const subtitle = [
        tx.category?.name && tx.note ? tx.category.name : null,
        tx.account.name,
    ].filter(Boolean).join(' · ')

    return (
        <div
            role="button"
            tabIndex={0}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-line-soft last:border-b-0 select-none cursor-pointer hover:bg-surface-soft active:bg-surface-hover transition-colors"
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onOpen?.(tx)
                }
            }}
            {...(deletable ? longPressHandlers : { onClick: () => onOpen?.(tx) })}
        >
            <CategoryTile category={tx.category}>
                {!tx.category && <TypeIcon type={tx.type} />}
            </CategoryTile>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{title}</p>
                {subtitle && (
                    <p className="text-[11px] text-muted-ink truncate">{subtitle}</p>
                )}
            </div>
            <p className={cn('text-[13px] font-medium tabular-nums shrink-0', amountColor(tx.type))}>
                {amountSign(tx.type)}{formatCurrency(tx.amount)}
            </p>
        </div>
    )
}

function DayTransactions({
    txs,
    onDeleteRequest,
    onOpen,
    readOnly,
}: {
    txs: TransactionWithDetails[]
    onDeleteRequest?: (id: string) => void
    onOpen?: (tx: TransactionWithDetails) => void
    readOnly?: boolean
}) {
    const deletable = !readOnly && !!onDeleteRequest

    return (
        <div className="border-t border-line-soft">
            {txs.map(tx => (
                <DayTransactionRow
                    key={tx.id}
                    tx={tx}
                    onDeleteRequest={onDeleteRequest}
                    onOpen={onOpen}
                    deletable={deletable}
                />
            ))}
        </div>
    )
}

function ModeSwitch({ mode, onChange }: { mode: CalendarMode; onChange: (m: CalendarMode) => void }) {
    return (
        <div role="group" aria-label="Calendar view" className="flex p-[2px] rounded-[9px] bg-surface-hover shrink-0">
            {(['month', 'days'] as const).map(m => (
                <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => onChange(m)}
                    className={cn(
                        'px-2.5 py-[5px] rounded-[7px] text-[11px] capitalize',
                        mode === m
                            ? 'bg-raised shadow-[0_1px_2px_rgba(0,0,0,.06)] font-semibold text-ink'
                            : 'text-muted-ink'
                    )}
                >
                    {m}
                </button>
            ))}
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
    onDateSelect,
    onOpen,
    allowance = null,
    periodIncome = 0,
}: PeriodCalendarProps) {
    const [mode, setMode] = useState<CalendarMode>(readMode)

    const handleModeChange = (m: CalendarMode) => {
        setMode(m)
        saveMode(m)
    }

    const clamp = (d: string) => {
        if (d < periodStart) return periodStart
        if (d > periodEnd) return periodEnd
        return d
    }

    const [selectedDate, setSelectedDate] = useState<string>(clamp(defaultDate ?? periodStart))

    const validSelected = clamp(selectedDate)
    const today = formatDateLocal(new Date())

    const txByDate = new Map<string, TransactionWithDetails[]>()
    for (const tx of transactions) {
        if (!txByDate.has(tx.date)) txByDate.set(tx.date, [])
        txByDate.get(tx.date)!.push(tx)
    }

    // Bars are spending as the hero counts it: savings set aside aren't a heavy day.
    const dailyExpense = dailySpending(transactions)
    const maxExpense = Math.max(0, ...dailyExpense.values())

    // Marks are everyday spending against the allowance, which is worked out for that part:
    // rent paid on the 1st makes a tall bar, not a day "over".
    const everydayByDay = dailyEverydaySpending(transactions, periodIncome)
    const isOverDay = (date: string) => isOverAllowance(everydayByDay.get(date) ?? 0, allowance)
    const overDays = [...everydayByDay.keys()].filter(isOverDay).length

    const dayLabel = (date: string) => {
        const spent = dailyExpense.get(date) ?? 0
        return [
            dayName(date),
            spent > 0 ? `spent ${formatCurrency(spent)}` : date > today ? null : 'no spending',
            isOverDay(date) && allowance ? `over the ${allowanceName(allowance)}` : null,
        ].filter(Boolean).join(', ')
    }

    const dates = getDatesInRange(periodStart, periodEnd)
    const firstDayOfWeek = new Date(periodStart + 'T00:00:00').getDay()
    const paddedDates: (string | null)[] = [...Array(firstDayOfWeek).fill(null), ...dates]
    const remainder = paddedDates.length % 7
    if (remainder !== 0) paddedDates.push(...Array(7 - remainder).fill(null))

    // Latest first, as in the All list.
    const selectedTxs = (txByDate.get(validSelected) ?? []).slice().sort(latestFirst)

    const dailyIncomeSummary = selectedTxs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0)
    const dailySavingsSummary = selectedTxs.filter(isSaving).reduce((sum, tx) => sum + tx.amount, 0)
    const dailyExpenseSummary = dailyExpense.get(validSelected) ?? 0

    const handleSelectDate = (date: string) => {
        setSelectedDate(date)
        onDateSelect?.(date)
    }

    const railRef = useRef<HTMLDivElement>(null)
    const selectedPillRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (mode === 'days') {
            selectedPillRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }
    }, [mode, validSelected])

    const rangeCaption = rangeLabel(periodStart, periodEnd)

    return (
        <div className="space-y-3 pt-3 lg:grid lg:grid-cols-[480px_360px] lg:gap-4 lg:items-start lg:space-y-0">
            <div className={cn(
                'card pt-[18px] pb-4',
                mode === 'month' ? 'px-4' : 'px-0',
            )}>
                <div className={cn(
                    'flex items-center justify-between gap-2.5 pb-[14px]',
                    mode === 'month' ? 'px-0.5' : 'px-[18px]',
                )}>
                    <div>
                        <p className="text-[11px] tracking-[.14em] uppercase text-muted-ink">{rangeCaption}</p>
                        <p className="mt-0.5 text-[11px] text-subtle-ink">
                            {allowance
                                ? overDays > 0
                                    ? <><span className="text-negative">{overDays} day{overDays === 1 ? '' : 's'}</span> over {formatShortCurrency(Math.round(allowance.amount))}/day {allowance.kind === 'safe' ? 'safe' : 'share'}</>
                                    : `every day within ${formatShortCurrency(Math.round(allowance.amount))}/day ${allowance.kind === 'safe' ? 'safe' : 'share'}`
                                : mode === 'month'
                                    ? `tallest day ${formatCompact(maxExpense)}`
                                    : 'swipe the rail, tap a day'}
                        </p>
                    </div>
                    <ModeSwitch mode={mode} onChange={handleModeChange} />
                </div>

                {mode === 'month' ? (
                    <>
                        <div className="grid grid-cols-7 gap-[5px] mb-[6px]">
                            {DAY_LETTERS.map((l, i) => (
                                <div key={i} className="text-[9.5px] text-center text-faint-ink tracking-[.04em]">
                                    {l}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-[5px]">
                            {paddedDates.map((date, i) => {
                                if (!date) return <div key={`pad-${i}`} />

                                const dayNum = new Date(date + 'T00:00:00').getDate()
                                const expense = dailyExpense.get(date) ?? 0
                                const isSelected = validSelected === date
                                const isToday = date === today
                                const isFuture = date > today
                                const highlighted = isSelected || isToday
                                const height = barHeight(expense, maxExpense)
                                const ratio = maxExpense > 0 ? expense / maxExpense : 0

                                return (
                                    <button
                                        key={date}
                                        type="button"
                                        onClick={() => handleSelectDate(date)}
                                        aria-label={dayLabel(date)}
                                        aria-pressed={isSelected}
                                        aria-current={isToday ? 'date' : undefined}
                                        className={cn(
                                            'aspect-square rounded-[9px] p-1 flex flex-col items-center justify-between border',
                                            highlighted
                                                ? 'bg-brand/10 border-brand'
                                                : isFuture
                                                    ? 'bg-transparent border-transparent'
                                                    : 'bg-surface-soft border-line-soft',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'relative text-[9.5px] tabular-nums',
                                                highlighted ? 'font-semibold text-brand-ink' : isFuture ? 'text-faint-ink' : 'text-ink',
                                            )}
                                        >
                                            {dayNum}
                                            {isOverDay(date) && (
                                                <span aria-hidden="true" className="absolute -top-0.5 -right-1.5 w-1 h-1 rounded-full bg-negative" />
                                            )}
                                        </span>
                                        <div
                                            aria-hidden="true"
                                            className="w-[70%] rounded-[2px_2px_1px_1px]"
                                            style={{
                                                height: `${height || 2}px`,
                                                backgroundColor: height ? heatBarColor(ratio) : 'var(--line-soft)',
                                            }}
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <div ref={railRef} data-no-swipe className="flex gap-[7px] overflow-x-auto px-[18px] pt-0.5 pb-1 [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden">
                        {dates.map(date => {
                            const d = new Date(date + 'T00:00:00')
                            const expense = dailyExpense.get(date) ?? 0
                            const isSelected = validSelected === date
                            const height = barHeight(expense, maxExpense)
                            const ratio = maxExpense > 0 ? expense / maxExpense : 0

                            return (
                                <button
                                    key={date}
                                    ref={isSelected ? selectedPillRef : undefined}
                                    type="button"
                                    onClick={() => handleSelectDate(date)}
                                    aria-label={dayLabel(date)}
                                    aria-pressed={isSelected}
                                    aria-current={date === today ? 'date' : undefined}
                                    className={cn(
                                        'shrink-0 w-[46px] rounded-[14px] border py-[9px] flex flex-col items-center gap-[5px] [scroll-snap-align:center]',
                                        isSelected ? 'bg-ink border-ink' : 'bg-surface border-line-soft',
                                    )}
                                >
                                    <span className={cn('text-[9.5px]', isSelected ? 'text-on-ink/60' : 'text-faint-ink')}>
                                        {d.toLocaleDateString('en-GB', { weekday: 'short' }).charAt(0)}
                                    </span>
                                    <span className={cn('relative text-[16px] font-semibold tabular-nums', isSelected ? 'text-on-ink' : 'text-ink')}>
                                        {d.getDate()}
                                        {isOverDay(date) && (
                                            <span aria-hidden="true" className="absolute -top-0.5 -right-2 w-1.5 h-1.5 rounded-full bg-negative" />
                                        )}
                                    </span>
                                    <div aria-hidden="true" className="w-[14px] h-[26px] flex items-end justify-center">
                                        <div
                                            className="w-full rounded-[2px_2px_1px_1px]"
                                            style={{
                                                height: `${height || 2}px`,
                                                backgroundColor: !height ? 'var(--line-soft)' : isSelected ? 'var(--brand)' : heatBarColor(ratio),
                                            }}
                                        />
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="card overflow-hidden lg:sticky lg:top-4">
                <div className="flex items-center justify-between gap-2.5 px-5 pt-4 pb-3.5">
                    <div>
                        <p aria-live="polite" className="text-[14px] font-semibold text-ink">{dayName(validSelected)}</p>

                        {selectedTxs.length > 0 && (
                            <p className="mt-0.5 text-[11px]">
                                <span className="text-muted-ink">
                                    {selectedTxs.length} transaction{selectedTxs.length === 1 ? '' : 's'}
                                </span>
                                {dailyExpenseSummary > 0 && <span className="text-ink"> · −{formatCurrency(dailyExpenseSummary)}</span>}
                                {dailySavingsSummary > 0 && <span className="text-info"> · {formatCurrency(dailySavingsSummary)} saved</span>}
                                {dailyIncomeSummary > 0 && (
                                    <span className="text-positive"> · +{formatCurrency(dailyIncomeSummary)}</span>
                                )}
                            </p>
                        )}
                    </div>

                </div>

                {allowance && validSelected <= today && (
                    <DayAllowance spent={everydayByDay.get(validSelected) ?? 0} allowance={allowance} />
                )}

                {selectedTxs.length === 0 ? (
                    <p className="text-[12px] text-muted-ink px-5 pb-4">
                        {validSelected > today ? 'This day hasn’t happened yet.' : 'No transactions this day.'}
                    </p>
                ) : (
                    <DayTransactions
                        txs={selectedTxs}
                        onDeleteRequest={onDeleteRequest}
                        onOpen={onOpen}
                        readOnly={readOnly}
                    />
                )}
            </div>
        </div>
    )
}

/** The selected day's everyday spending against the allowance — a bar that turns red past it. */
function DayAllowance({ spent, allowance }: { spent: number; allowance: DailyAllowance }) {
    const limit = allowance.amount
    const over = isOverAllowance(spent, allowance)
    const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : spent > 0 ? 100 : 0
    const name = `${formatShortCurrency(Math.round(limit))} ${allowanceName(allowance)}`
    return (
        <div className="px-5 pb-3.5">
            <div aria-hidden="true" className="h-1 rounded-full bg-line-soft overflow-hidden">
                <div className={cn('h-full rounded-full', over ? 'bg-negative' : 'bg-brand')} style={{ width: `${pct}%` }} />
            </div>
            <p className={cn('mt-1.5 text-[11px] tabular-nums', over ? 'text-negative' : 'text-muted-ink')}>
                {limit <= 0
                    ? spent > 0
                        ? `${formatShortCurrency(spent)} everyday spending with no safe room left`
                        : 'No everyday spending, and no safe room left this period'
                    : over
                        ? `${formatShortCurrency(spent - limit)} over the ${name}`
                        : spent === 0
                            ? `No everyday spending — ${name} untouched`
                            : `${formatShortCurrency(Math.round(limit - spent))} under the ${name}`}
            </p>
        </div>
    )
}
