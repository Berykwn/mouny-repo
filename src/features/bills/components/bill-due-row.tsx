import { Check } from 'lucide-react'
import { formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { BillDue } from '../lib/bills'
import { dueLabel, shortDate } from '../lib/bill-labels'

interface BillDueRowProps {
    due: BillDue
    onPay?: () => void
    onOpen?: () => void
}

/** One bill in a period: its due date, where it stands, and a Pay button while it's due. */
export function BillDueRow({ due, onPay, onOpen }: BillDueRowProps) {
    const { bill, nextDue, status } = due
    const date = nextDue ?? due.payments[0]?.date ?? due.dueDates[0]
    const [day, month] = date ? shortDate(date).split(' ') : ['', '']
    const paid = status === 'paid'
    const late = status === 'overdue'
    const soon = status === 'soon'

    return (
        <div className="flex items-center gap-3 py-2">
            <button
                type="button"
                onClick={onOpen}
                disabled={!onOpen}
                className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-[12px] disabled:cursor-default"
            >
                <div className={cn(
                    'w-11 h-11 rounded-[12px] flex flex-col items-center justify-center shrink-0 border leading-none',
                    paid ? 'bg-positive/10 border-positive/20 text-positive'
                        : late ? 'bg-negative/10 border-negative/20 text-negative'
                            : soon ? 'bg-warning/10 border-warning/20 text-warning'
                                : 'bg-surface border-line text-ink'
                )}>
                    {paid ? <Check className="w-4 h-4" strokeWidth={2.4} /> : (
                        <>
                            <span className="text-[15px] font-semibold tabular-nums">{day}</span>
                            <span className="text-[9.5px] uppercase tracking-[.08em] mt-0.5">{month}</span>
                        </>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">{bill.name}</p>
                    <p className={cn('text-[11px]', paid ? 'text-muted-ink' : late ? 'text-negative' : soon ? 'text-warning' : 'text-muted-ink')}>
                        {paid
                            ? `Paid${due.payments[0] ? ` on ${shortDate(due.payments[0].date)}` : ''}`
                            : dueLabel(nextDue!) + (due.outstanding > 1 ? ` · ${due.outstanding} due` : '')}
                    </p>
                </div>
            </button>
            {paid ? (
                <span className="text-[12.5px] font-medium tabular-nums text-muted-ink shrink-0">{formatShortCurrency(due.paidAmount)}</span>
            ) : (
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12.5px] font-medium tabular-nums text-ink">{formatShortCurrency(bill.amount)}</span>
                    {onPay && (
                        <button
                            type="button"
                            onClick={onPay}
                            className="h-8 px-3 rounded-[10px] bg-brand text-white text-[12px] font-semibold hover:bg-brand/90 transition-colors"
                        >
                            Pay
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
