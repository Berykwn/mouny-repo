import { MessageCircle, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { DebtWithAccount } from '@/types'
import type { DebtPaymentWithAccount } from '@/services/debts.service'
import { useDebtPayments } from '@/queries'
import { dayDate, monthYear, shortDate } from '@/features/bills/lib/bill-labels'
import { debtProgress, dueStatus, payoffSchedule, type PayoffStop } from '../lib/debt-insights'
import { sendReminder } from '../lib/reminder'

const PRIMARY_BTN = 'flex-1 h-12 rounded-[14px] text-[13px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none'
const SECONDARY_BTN = 'flex-1 h-12 rounded-[14px] text-[13px] font-semibold bg-surface-hover text-ink hover:bg-line-soft transition-colors flex items-center justify-center gap-2'

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))

function Line({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2.5">
            <p className="text-[13px] text-muted-ink truncate">{label}</p>
            <p className={cn('text-[13px] font-medium tabular-nums text-right shrink-0', className ?? 'text-ink')}>{value}</p>
        </div>
    )
}

interface DebtDetailProps {
    debt: DebtWithAccount
    /** This debt's place in the payoff plan (debts only). */
    stop: PayoffStop | undefined
    hasActivePeriod: boolean
    onSettle: () => void
    onEdit: () => void
    onDelete: () => void
}

/** One debt or receivable in full: what's left, the plan to clear it, and what's been paid. */
export function DebtDetail({ debt, stop, hasActivePeriod, onSettle, onEdit, onDelete }: DebtDetailProps) {
    const isDebt = debt.type === 'debt'
    const settled = debt.status === 'paid' || debt.remaining_amount === 0
    const { paid, percent } = debtProgress(debt)
    const status = dueStatus(debt)

    const paymentsQuery = useDebtPayments(debt.id)
    // A failed load (e.g. the history table isn't there yet) reads as no history.
    const payments: DebtPaymentWithAccount[] | null = paymentsQuery.isPending ? null : paymentsQuery.data ?? []
    const logged = payments?.reduce((s, p) => s + p.amount, 0) ?? 0
    const schedule = !settled && isDebt && stop ? payoffSchedule(stop) : []

    const since = debt.created_at ? `${isDebt ? 'borrowed' : 'lent'} ${shortDate(debt.created_at.slice(0, 10))}` : null
    const side = settled ? (isDebt ? 'Paid off' : 'Paid back') : isDebt ? 'You owe' : 'Owed to you'

    let note: { text: string; className: string } | null = null
    if (!settled && status.kind === 'overdue') {
        note = isDebt
            ? { text: `${status.days} day${status.days === 1 ? '' : 's'} past its due date. Pay what you can, or agree a new date with them.`, className: 'bg-negative-soft text-negative-ink' }
            : { text: `${debt.counterparty} is ${status.days} day${status.days === 1 ? '' : 's'} late paying you back. A friendly reminder may help.`, className: 'bg-warning-soft text-warning-ink' }
    }

    return (
        <div className="space-y-5 pb-2">
            <div>
                <p className="text-[12.5px] text-muted-ink">{[side, since].filter(Boolean).join(' · ')}</p>
                <p className="mt-1 text-[32px] font-semibold tracking-[-0.03em] leading-tight tabular-nums text-ink">
                    {settled ? formatCurrency(debt.total_amount) : formatCurrency(debt.remaining_amount)}
                </p>
                {!settled && paid > 0 && (
                    <p className="text-[12px] text-muted-ink tabular-nums">of {formatCurrency(debt.total_amount)} · {percent}% {isDebt ? 'paid' : 'back'}</p>
                )}
                <div aria-hidden="true" className="mt-3 h-1.5 rounded-full bg-line-soft overflow-hidden">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${settled ? 100 : percent}%` }} />
                </div>
            </div>

            {note && <p className={cn('rounded-[14px] px-3 py-2.5 text-[12px] leading-relaxed', note.className)}>{note.text}</p>}

            {!settled && (
                <div className="space-y-1.5">
                    <div className="flex gap-2">
                        <button type="button" onClick={onSettle} disabled={!hasActivePeriod} className={PRIMARY_BTN}>
                            {isDebt ? 'Record payment' : 'Record collection'}
                        </button>
                        <button type="button" onClick={onEdit} className={SECONDARY_BTN}>
                            <Pencil className="w-4 h-4" /> Edit
                        </button>
                    </div>
                    {!hasActivePeriod && (
                        <p className="text-center text-[11px] text-muted-ink">Open a pay period to record money moving.</p>
                    )}
                </div>
            )}

            {/* Plan: an even split over the periods left before the due date */}
            {!settled && (schedule.length > 0 || debt.due_date || stop?.date) && (
                <section>
                    <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Plan</h3>
                    <div className="divide-y divide-line-soft">
                        {schedule.map(s => (
                            <Line
                                key={s.label}
                                label={s.last && debt.due_date ? `By ${dayDate(debt.due_date)} · last` : s.label}
                                value={s.done ? 'Done for this period' : plain(s.amount)}
                                className={s.done ? 'text-brand-ink' : undefined}
                            />
                        ))}
                        {schedule.length === 0 && debt.due_date && (
                            <Line label={status.kind === 'overdue' ? `Was due ${dayDate(debt.due_date)}` : `Due ${dayDate(debt.due_date)}`} value={plain(debt.remaining_amount)} className={status.kind === 'overdue' ? 'text-negative' : undefined} />
                        )}
                        {isDebt && stop?.date && <Line label="Paid off at your usual leftover" value={`~${monthYear(stop.date)}`} />}
                    </div>
                    {schedule.length > 1 && (
                        <p className="mt-1 text-[11.5px] text-subtle-ink leading-relaxed">
                            {schedule[0].done
                                ? 'This period’s share is paid; what’s left is split evenly over the periods after it.'
                                : 'What’s left, split evenly over the periods before its due date.'}
                        </p>
                    )}
                </section>
            )}

            {/* History */}
            <section>
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{isDebt ? 'Paid' : 'Collected'}</h3>
                {payments === null ? (
                    <p className="py-2.5 text-[12px] text-subtle-ink">Loading…</p>
                ) : payments.length === 0 && paid === 0 ? (
                    <p className="py-2.5 text-[12.5px] text-muted-ink">No {isDebt ? 'payments' : 'collections'} yet.</p>
                ) : (
                    <div className="divide-y divide-line-soft">
                        {payments.map(p => (
                            <Line key={p.id} label={[dayDate(p.date.slice(0, 10)), p.account?.name].filter(Boolean).join(' · ')} value={plain(p.amount)} className="text-brand-ink" />
                        ))}
                        {paid > logged && <Line label="Earlier, before history was kept" value={plain(paid - logged)} className="text-muted-ink" />}
                    </div>
                )}
            </section>

            {(debt.notes || debt.pay_from_account) && (
                <div className="divide-y divide-line-soft">
                    {debt.pay_from_account && <Line label="Account" value={debt.pay_from_account.name} />}
                    {debt.notes && <p className="py-2.5 text-[12.5px] text-ink leading-relaxed">{debt.notes}</p>}
                </div>
            )}

            <div className="flex items-center justify-center gap-6">
                {!settled && !isDebt && (
                    <button type="button" onClick={() => sendReminder(debt)} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-ink py-2">
                        <MessageCircle className="w-3.5 h-3.5" /> Send a reminder
                    </button>
                )}
                <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-negative py-2">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
            </div>
        </div>
    )
}
