import { DollarSign, Pause, Pencil, Play, Receipt, Repeat, Trash2 } from 'lucide-react'
import { daysUntil, formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { RecurringBill } from '@/types'
import type { BillDue } from '../lib/bills'
import { dueLabel, scheduleLabel, shortDate } from '../lib/bill-labels'

const PRIMARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none'
const SECONDARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold border border-line text-ink hover:bg-surface-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none'

interface BillDetailProps {
    bill: RecurringBill
    /** Where the bill stands in the open period, if it falls in it. */
    due: BillDue | undefined
    nextDue: string | null
    busy: boolean
    onPay: () => void
    onTogglePause: () => void
    onEdit: () => void
    onDelete: () => void
}

/** One bill in full, with its actions — kept off the rows so the list stays calm. */
export function BillDetail({ bill, due, nextDue, busy, onPay, onTogglePause, onEdit, onDelete }: BillDetailProps) {
    const Icon = bill.kind === 'subscription' ? Repeat : Receipt
    const canPay = !!due && due.outstanding > 0
    const late = due?.status === 'overdue'
    const perYear = bill.frequency === 'yearly' ? bill.amount : bill.amount * 12

    let note: { text: string; className: string } | null = null
    if (bill.paused) {
        note = { text: 'Paused: not held back from safe to spend.', className: 'bg-surface-soft text-muted-ink' }
    } else if (late && due?.nextDue) {
        note = { text: `Due ${shortDate(due.nextDue)} and not paid yet.`, className: 'bg-negative/10 text-negative' }
    } else if (due?.status === 'paid') {
        note = { text: 'Paid for this period.', className: 'bg-positive/10 text-positive' }
    }

    const facts: { label: string; value: string; className?: string }[] = [
        { label: 'Repeats', value: scheduleLabel(bill) },
        ...(!bill.paused ? [{
            label: 'Next due',
            value: nextDue ? `${shortDate(nextDue)} · ${dueLabel(nextDue).toLowerCase()}` : 'No more payments',
            className: nextDue && daysUntil(nextDue) <= 7 ? 'text-warning' : undefined,
        }] : []),
        { label: 'Over a year', value: formatCurrency(perYear) },
        ...(due && due.paidAmount > 0 ? [{ label: 'Paid this period', value: formatCurrency(due.paidAmount) }] : []),
    ]

    return (
        <div className="space-y-4 pb-2">
            <div className="flex items-center gap-3">
                <span className={cn(
                    'w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0',
                    bill.paused ? 'bg-surface-hover text-muted-ink' : 'bg-info/10 text-info'
                )}>
                    <Icon className="w-5 h-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] text-muted-ink">{bill.kind === 'subscription' ? 'Subscription' : 'Bill'}</p>
                    <p className="text-[24px] font-medium tracking-[-0.02em] leading-tight tabular-nums text-ink">
                        {formatCurrency(bill.amount)}
                    </p>
                </div>
            </div>

            {note && <p className={cn('rounded-[14px] px-3 py-2.5 text-[12px] leading-relaxed', note.className)}>{note.text}</p>}

            <div className="rounded-[20px] bg-surface-soft border border-line-soft divide-y divide-line-soft">
                {facts.map(f => (
                    <div key={f.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <p className="text-[11.5px] text-muted-ink">{f.label}</p>
                        <p className={cn('text-[12.5px] font-medium text-right truncate', f.className ?? 'text-ink')}>{f.value}</p>
                    </div>
                ))}
            </div>

            {/* Actions: one clear primary, the rest quiet */}
            <div className="space-y-2 pt-1">
                {canPay && (
                    <button type="button" onClick={onPay} className={PRIMARY_BTN}>
                        <DollarSign className="w-4 h-4" /> Record payment
                    </button>
                )}
                <button type="button" onClick={onTogglePause} disabled={busy} className={SECONDARY_BTN}>
                    {bill.paused ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
                </button>
                <div className="flex items-center justify-center gap-6 pt-1">
                    <button type="button" onClick={onEdit} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-ink py-2">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-negative py-2">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                </div>
            </div>
        </div>
    )
}
