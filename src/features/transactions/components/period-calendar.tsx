import { useState } from 'react'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'
import { cn } from '@/lib/utils'
import { useLongPress } from '@/hooks/use-long-press'
import {
    dailyEverydaySpending, dailySpending, dayNet, groupByDate, isOverAllowance, pairTransfers, type DailyAllowance,
} from '../lib/ledger'
import { formatNet, rowMeta } from '../lib/row-format'
import { DayHeader, LedgerRowBody } from './ledger-row'

interface PeriodCalendarProps {
    transactions: TransactionWithDetails[]
    periodStart: string
    periodEnd: string
    defaultDate?: string
    onDeleteRequest?: (id: string) => void
    readOnly?: boolean
    onDateSelect?: (date: string) => void
    /** Tapping a transaction opens its detail. */
    onOpen?: (tx: TransactionWithDetails) => void
    /** The row whose detail is open beside the calendar, on a wide screen. */
    openId?: string | null
    /** What a day's everyday spending is held against; days past it get a mark. */
    allowance?: DailyAllowance | null
    /** The period's income, which decides what counts as a one-off. */
    periodIncome?: number
}

const allowanceName = (a: DailyAllowance) => a.kind === 'safe' ? 'safe daily amount' : 'everyday share'

function dayName(date: string) {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function shortDayName(date: string) {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Weeks start on Monday, as Indonesian calendars do.
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

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

/** "Sep – Oct", or "Oct" for a period inside one month. */
function rangeLabel(start: string, end: string): string {
    const month = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })
    const s = month(start)
    const e = month(end)
    return s === e ? s : `${s} – ${e}`
}

function DayTransactionRow({
    tx,
    meta,
    onDeleteRequest,
    onOpen,
    deletable,
    open,
}: {
    tx: TransactionWithDetails
    meta: string
    onDeleteRequest?: (id: string) => void
    onOpen?: (tx: TransactionWithDetails) => void
    deletable: boolean
    open: boolean
}) {
    // Long-press stays as a shortcut to delete; a plain tap opens the detail.
    const longPressHandlers = useLongPress(() => onDeleteRequest?.(tx.id), { onTap: () => onOpen?.(tx) })

    return (
        <div
            role="button"
            tabIndex={0}
            aria-current={open ? 'true' : undefined}
            className={cn(
                '-mx-2 px-2 rounded-[12px] select-none cursor-pointer transition-colors',
                open ? 'bg-surface-hover' : 'hover:bg-surface-soft active:bg-surface-hover',
            )}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onOpen?.(tx)
                }
            }}
            {...(deletable ? longPressHandlers : { onClick: () => onOpen?.(tx) })}
        >
            <div className="flex items-center gap-3 py-3 border-b border-line-soft">
                <LedgerRowBody tx={tx} meta={meta} />
            </div>
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
    openId,
    allowance = null,
    periodIncome = 0,
}: PeriodCalendarProps) {
    const clamp = (d: string) => {
        if (d < periodStart) return periodStart
        if (d > periodEnd) return periodEnd
        return d
    }

    const [selectedDate, setSelectedDate] = useState<string>(clamp(defaultDate ?? periodStart))

    const validSelected = clamp(selectedDate)
    const today = formatDateLocal(new Date())

    // Each cell's amount is spending as the hero counts it: savings set aside aren't a heavy day.
    const dailyExpense = dailySpending(transactions)

    // Marks are everyday spending against the allowance, which is worked out for that part:
    // rent paid on the 1st makes a big number, not a day "over".
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
    const firstDayOfWeek = (new Date(periodStart + 'T00:00:00').getDay() + 6) % 7
    const paddedDates: (string | null)[] = [...Array(firstDayOfWeek).fill(null), ...dates]
    const remainder = paddedDates.length % 7
    if (remainder !== 0) paddedDates.push(...Array(7 - remainder).fill(null))

    // A transfer is one row, as in the list; latest first.
    const { rows, otherSide } = pairTransfers(transactions)
    const day = groupByDate(rows.filter(tx => tx.date === validSelected))[0]
    const selectedTxs = day?.txs ?? []
    const net = day ? dayNet(day) : 0
    const deletable = !readOnly && !!onDeleteRequest

    // The selected day against the allowance, in a few words beside its total.
    const spentEveryday = everydayByDay.get(validSelected) ?? 0
    const allowanceNote = !allowance || validSelected > today || spentEveryday === 0
        ? null
        : isOverAllowance(spentEveryday, allowance)
            ? `${formatShortCurrency(Math.round(spentEveryday - allowance.amount))} over`
            : `${formatShortCurrency(Math.round(allowance.amount - spentEveryday))} under`

    const handleSelectDate = (date: string) => {
        setSelectedDate(date)
        onDateSelect?.(date)
    }

    return (
        <div className="pt-1">
            <div className="flex items-baseline justify-between gap-3 pb-3">
                <p className="text-[15px] font-semibold text-ink">{rangeLabel(periodStart, periodEnd)}</p>
                {allowance && (
                    <p className="text-[12px] text-muted-ink tabular-nums truncate">
                        {allowance.kind === 'safe' ? 'Safe' : 'Share'}/day {formatShortCurrency(Math.round(allowance.amount))}
                        {overDays > 0 && <span className="text-negative"> · {overDays} day{overDays === 1 ? '' : 's'} over</span>}
                    </p>
                )}
            </div>

            <div aria-hidden="true" className="grid grid-cols-7 gap-1.5 mb-1.5">
                {DAY_LETTERS.map((l, i) => (
                    <div key={i} className="text-[11px] font-medium text-center text-muted-ink">{l}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
                {paddedDates.map((date, i) => {
                    if (!date) return <div key={`pad-${i}`} />

                    const dayNum = new Date(date + 'T00:00:00').getDate()
                    const expense = dailyExpense.get(date) ?? 0
                    const isSelected = validSelected === date
                    const isToday = date === today
                    const isFuture = date > today
                    const over = isOverDay(date)

                    return (
                        <button
                            key={date}
                            type="button"
                            onClick={() => handleSelectDate(date)}
                            aria-label={dayLabel(date)}
                            aria-pressed={isSelected}
                            aria-current={isToday ? 'date' : undefined}
                            className={cn(
                                'relative h-[54px] lg:h-[60px] rounded-[12px] border flex flex-col items-center justify-between py-1.5 transition-colors',
                                isSelected
                                    ? 'bg-ink border-ink'
                                    : isFuture
                                        ? 'bg-transparent border-dashed border-line'
                                        : isToday
                                            ? 'bg-surface-hover border-brand'
                                            : 'bg-surface-hover border-transparent hover:border-line',
                            )}
                        >
                            <span className={cn(
                                'text-[13px] font-semibold tabular-nums',
                                isSelected ? 'text-on-ink' : isFuture ? 'text-faint-ink' : 'text-ink',
                            )}>
                                {dayNum}
                            </span>
                            <span className={cn(
                                'text-[10.5px] font-medium tabular-nums leading-none',
                                isSelected ? 'text-on-ink/85' : over ? 'text-negative' : 'text-muted-ink',
                            )}>
                                {expense > 0 ? formatShortCurrency(expense) : ''}
                            </span>
                            {over && (
                                <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-negative" />
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="mt-2">
                <DayHeader label={shortDayName(validSelected)}>
                    {[net !== 0 ? formatNet(net) : null, allowanceNote].filter(Boolean).join(' · ') || null}
                </DayHeader>
                <p aria-live="polite" className="sr-only">{dayName(validSelected)}</p>

                {selectedTxs.length === 0 ? (
                    <p className="text-[13px] text-muted-ink py-6 text-center">
                        {validSelected > today ? 'This day hasn’t happened yet.' : 'No transactions this day.'}
                    </p>
                ) : (
                    selectedTxs.map(tx => (
                        <DayTransactionRow
                            key={tx.id}
                            tx={tx}
                            meta={rowMeta(tx, { otherSide: otherSide.get(tx.id) })}
                            onDeleteRequest={onDeleteRequest}
                            onOpen={onOpen}
                            deletable={deletable}
                            open={openId === tx.id}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
