import { Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { daysUntil, formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { RecurringBill } from '@/types'
import type { BillDue } from '../lib/bills'
import { lastPriceChange, type BillPayment } from '../lib/bill-history'
import { dayDate, dueLabel, scheduleLabel, shortDate } from '../lib/bill-labels'
import { BillTile } from './bill-tile'
import { PriceChart } from './price-chart'

const PRIMARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none'
const SECONDARY_BTN = 'flex-1 h-11 rounded-[14px] text-[13px] font-semibold bg-surface-hover text-ink hover:bg-line-soft transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none'
const HISTORY_ROWS = 4

interface BillDetailProps {
    bill: RecurringBill
    /** Where the bill stands in the open period, if it falls in it. */
    due: BillDue | undefined
    nextDue: string | null
    /** Its payments over recent periods, oldest first; null while loading. */
    payments: BillPayment[] | null
    busy: boolean
    onPay: () => void
    onTogglePause: () => void
    onEdit: () => void
    onDelete: () => void
}

/** One bill in full: what it costs, what it was paid, and its actions. */
export function BillDetail({ bill, due, nextDue, payments, busy, onPay, onTogglePause, onEdit, onDelete }: BillDetailProps) {
    const canPay = !!due && due.outstanding > 0
    const late = due?.status === 'overdue'
    const perYear = bill.frequency === 'yearly' ? bill.amount : bill.amount * 12
    const change = payments ? lastPriceChange(payments) : null

    let note: { text: string; className: string } | null = null
    if (bill.paused) {
        note = { text: 'Paused: not held back from safe to spend.', className: 'bg-surface-hover text-muted-ink' }
    } else if (late && due?.nextDue) {
        note = { text: `Due ${shortDate(due.nextDue)} and not paid yet.`, className: 'bg-negative-soft text-negative-ink' }
    } else if (due?.status === 'paid') {
        note = { text: 'Paid for this period.', className: 'bg-brand-tint text-brand-ink' }
    }

    const facts: { label: string; value: string; className?: string }[] = [
        ...(!bill.paused ? [{
            label: 'Next due',
            value: nextDue ? `${dayDate(nextDue)} · ${dueLabel(nextDue).toLowerCase()}` : 'No more payments',
            className: nextDue && daysUntil(nextDue) <= 7 ? 'text-warning' : undefined,
        }] : []),
        { label: 'Over a year', value: formatCurrency(perYear) },
        ...(due && due.paidAmount > 0 ? [{ label: 'Paid this period', value: formatCurrency(due.paidAmount) }] : []),
    ]
    const recent = payments ? payments.slice(-HISTORY_ROWS).reverse() : []

    return (
        <div className="space-y-5 pb-2">
            <div>
                <p className="flex items-center gap-2 text-[12.5px] text-muted-ink">
                    <BillTile bill={bill} size="sm" />
                    {bill.kind === 'subscription' ? 'Subscription' : 'Bill'} · {scheduleLabel(bill).toLowerCase()}
                </p>
                <p className="mt-2 text-[32px] font-semibold tracking-[-0.03em] leading-tight tabular-nums text-ink">
                    {formatCurrency(bill.amount)}
                </p>
                {change && (
                    <p className={cn('text-[12px] tabular-nums', change.percent > 0 ? 'text-warning' : 'text-muted-ink')}>
                        {change.percent > 0 ? 'Up' : 'Down'} {Math.abs(change.percent)}% since {shortDate(change.since)}, from {formatCurrency(change.from)}
                    </p>
                )}
            </div>

            {note && <p className={cn('rounded-[14px] px-3 py-2.5 text-[12px] leading-relaxed', note.className)}>{note.text}</p>}

            {canPay && (
                <button type="button" onClick={onPay} className={PRIMARY_BTN}>
                    Pay now
                </button>
            )}

            <div className="divide-y divide-line-soft">
                {facts.map(f => (
                    <div key={f.label} className="flex items-center justify-between gap-3 py-2.5">
                        <p className="text-[13px] text-muted-ink">{f.label}</p>
                        <p className={cn('text-[13px] font-medium text-right truncate tabular-nums', f.className ?? 'text-ink')}>{f.value}</p>
                    </div>
                ))}
            </div>

            {/* Payments: what it really cost, so a price rise can't slip by */}
            <section>
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink mb-2">Payments</h3>
                {payments === null ? (
                    <p className="text-[12px] text-subtle-ink">Loading…</p>
                ) : payments.length === 0 ? (
                    <p className="text-[12px] text-muted-ink">No payments in the last few periods.</p>
                ) : (
                    <>
                        <PriceChart payments={payments} />
                        <div className="mt-2 divide-y divide-line-soft">
                            {recent.map(p => (
                                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                                    <p className="text-[13px] text-muted-ink truncate">{dayDate(p.date)}{p.account && ` · ${p.account}`}</p>
                                    <p className="text-[13px] font-medium tabular-nums text-ink shrink-0">{formatCurrency(p.amount)}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <div className="space-y-1 pt-1">
                <div className="flex gap-2">
                    <button type="button" onClick={onTogglePause} disabled={busy} className={SECONDARY_BTN}>
                        {bill.paused ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
                    </button>
                    <button type="button" onClick={onEdit} className={SECONDARY_BTN}>
                        <Pencil className="w-4 h-4" /> Edit
                    </button>
                </div>
                <div className="flex justify-center">
                    <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-negative py-2">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                </div>
            </div>
        </div>
    )
}
