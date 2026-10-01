import { DollarSign, HandCoins, Pencil, Trash2 } from 'lucide-react'
import ShareIcon from '~icons/ph/whatsapp-logo-duotone'
import HistoryIcon from '~icons/ph/clock-counter-clockwise-duotone'
import { formatCurrency, formatDate, formatDateShort } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/progress-bar'
import type { DebtWithAccount } from '@/types'
import type { DebtPaymentWithAccount } from '@/services/debts.service'
import { useDebtPayments } from '@/queries'
import { formatMonthYear } from '@/features/wish-list/lib/wish-analytics'
import { debtProgress, dueStatus, type DueStatus, type PayoffStop } from '../lib/debt-insights'
import { DebtAvatar } from './debt-avatar'

const PRIMARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none'
const SECONDARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold border border-line text-ink hover:bg-surface-hover transition-colors flex items-center justify-center gap-2'

function dueText(status: DueStatus, dueDate: string | null): { text: string; className: string } {
    switch (status.kind) {
        case 'none': return { text: 'No due date', className: 'text-muted-ink' }
        case 'overdue': return { text: `${status.days} day${status.days === 1 ? '' : 's'} overdue`, className: 'text-negative' }
        case 'today': return { text: 'Due today', className: 'text-warning' }
        case 'soon': return { text: `${formatDate(dueDate!)} · in ${status.days} day${status.days === 1 ? '' : 's'}`, className: 'text-warning' }
        case 'later': return { text: `${formatDate(dueDate!)} · in ${status.days} days`, className: 'text-ink' }
    }
}

/** A polite nudge to send the borrower, in the language most counterparties will read. */
function reminderText(debt: DebtWithAccount): string {
    const due = debt.due_date ? ` yang jatuh tempo ${formatDate(debt.due_date)}` : ''
    return `Halo ${debt.counterparty}, sekadar mengingatkan soal pinjaman ${formatCurrency(debt.remaining_amount)}${due}. Kalau sudah longgar, kabari ya. Terima kasih!`
}

async function sendReminder(debt: DebtWithAccount) {
    const text = reminderText(debt)
    if (navigator.share) {
        try {
            await navigator.share({ text })
            return
        } catch (err) {
            // The user closed the share sheet; anything else (blocked, unsupported) falls through.
            if (err instanceof DOMException && err.name === 'AbortError') return
        }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
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

/** One debt or receivable in full, with its actions — kept off the row so the list stays calm. */
export function DebtDetail({ debt, stop, hasActivePeriod, onSettle, onEdit, onDelete }: DebtDetailProps) {
    const isDebt = debt.type === 'debt'
    const settled = debt.status === 'paid' || debt.remaining_amount === 0
    const { paid, percent } = debtProgress(debt)
    const status = dueStatus(debt)
    const due = dueText(status, debt.due_date)

    const paymentsQuery = useDebtPayments(debt.id)
    // A failed load (e.g. the history table isn't there yet) reads as no history.
    const payments: DebtPaymentWithAccount[] | null = paymentsQuery.isPending ? null : paymentsQuery.data ?? []
    const logged = payments?.reduce((s, p) => s + p.amount, 0) ?? 0

    let note: { text: string; className: string } | null = null
    if (settled) {
        note = { text: isDebt ? 'Paid off in full. Nice work.' : 'Paid back in full.', className: 'bg-positive/10 text-positive' }
    } else if (status.kind === 'overdue') {
        note = isDebt
            ? { text: 'This is past its due date. Pay what you can, or agree a new date with them.', className: 'bg-negative/10 text-negative' }
            : { text: `${debt.counterparty} is late paying you back — a friendly reminder may help.`, className: 'bg-warning/10 text-warning' }
    }

    const facts: { label: string; value: string; className?: string }[] = [
        ...(!settled ? [{ label: 'Due', value: due.text, className: due.className }] : []),
        ...(!settled && stop?.date ? [{ label: 'Paid off at your pace', value: `~${formatMonthYear(stop.date)}` }] : []),
        ...(!settled && stop?.perPeriodNeeded && status.kind !== 'overdue'
            ? [{ label: 'To make the due date', value: `${formatCurrency(Math.ceil(stop.perPeriodNeeded))}/period` }]
            : []),
        ...(debt.pay_from_account ? [{ label: 'Account', value: debt.pay_from_account.name }] : []),
        ...(debt.created_at ? [{ label: 'Added', value: formatDate(debt.created_at) }] : []),
    ]

    return (
        <div className="space-y-4 pb-2">
            {/* Identity */}
            <div className="flex items-center gap-3">
                <DebtAvatar name={debt.counterparty} type={debt.type} settled={settled} className="w-12 h-12 text-[15px]" />
                <div className="min-w-0">
                    <p className="text-[11px] text-muted-ink">
                        {isDebt ? `You owe ${debt.counterparty}` : `${debt.counterparty} owes you`}
                    </p>
                    <p className={cn(
                        'text-[24px] font-medium tracking-[-0.02em] leading-tight tabular-nums',
                        settled ? 'text-positive' : 'text-ink'
                    )}>
                        {settled ? 'Settled' : formatCurrency(debt.remaining_amount)}
                    </p>
                </div>
            </div>

            {note && (
                <p className={cn('rounded-[14px] px-3 py-2.5 text-[12px] leading-relaxed', note.className)}>{note.text}</p>
            )}

            {/* Progress */}
            <div className="rounded-[20px] border border-line p-4">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[12px] text-muted-ink">{isDebt ? 'Paid' : 'Collected'}</p>
                    <p className="text-[12px] text-muted-ink tabular-nums">{percent}%</p>
                </div>
                <p className="text-[15px] font-medium text-ink tabular-nums mt-0.5">
                    {formatCurrency(paid)}
                    <span className="text-[12px] font-normal text-muted-ink"> of {formatCurrency(debt.total_amount)}</span>
                </p>
                <ProgressBar
                    percent={percent}
                    color={settled || !isDebt ? 'var(--positive)' : 'var(--negative)'}
                    className="mt-3 h-1.5"
                />
            </div>

            {/* Facts */}
            {(facts.length > 0 || debt.notes) && (
                <div className="rounded-[20px] bg-surface-soft border border-line-soft divide-y divide-line-soft">
                    {facts.map(f => (
                        <div key={f.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <p className="text-[11.5px] text-muted-ink">{f.label}</p>
                            <p className={cn('text-[12.5px] font-medium text-right truncate', f.className ?? 'text-ink')}>{f.value}</p>
                        </div>
                    ))}
                    {debt.notes && (
                        <p className="px-4 py-2.5 text-[12px] text-ink leading-relaxed">{debt.notes}</p>
                    )}
                </div>
            )}

            {/* History */}
            <div className="rounded-[20px] border border-line overflow-hidden">
                <p className="flex items-center gap-1.5 px-4 pt-3 pb-2 text-[11px] uppercase tracking-[.14em] text-muted-ink">
                    <HistoryIcon className="w-4 h-4" /> {isDebt ? 'Payments' : 'Collections'}
                </p>
                {payments === null ? (
                    <p className="px-4 pb-3 text-[12px] text-subtle-ink">Loading…</p>
                ) : payments.length === 0 ? (
                    <p className="px-4 pb-3 text-[12px] text-muted-ink">
                        {paid > 0
                            ? `${formatCurrency(paid)} ${isDebt ? 'paid' : 'collected'} before history was kept.`
                            : `No ${isDebt ? 'payments' : 'collections'} yet.`}
                    </p>
                ) : (
                    <ol className="relative border-t border-line-soft px-4 py-2">
                        <span aria-hidden className="absolute left-[19.5px] top-4 bottom-4 w-px bg-line" />
                        {payments.map(p => (
                            <li key={p.id} className="relative flex items-center gap-3 py-1.5">
                                <span className={cn('w-2 h-2 rounded-full shrink-0 ring-4 ring-white', isDebt ? 'bg-negative/70' : 'bg-positive/70')} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] text-ink">{formatDateShort(p.date)}</p>
                                    {p.account && <p className="text-[10.5px] text-subtle-ink truncate">{p.account.name}</p>}
                                </div>
                                <p className="text-[12.5px] font-medium tabular-nums text-ink shrink-0">{formatCurrency(p.amount)}</p>
                            </li>
                        ))}
                        {paid > logged && (
                            <li className="relative flex items-center gap-3 py-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0 ring-4 ring-white bg-line" />
                                <p className="flex-1 text-[11.5px] text-muted-ink">Earlier, before history was kept</p>
                                <p className="text-[12.5px] tabular-nums text-muted-ink shrink-0">{formatCurrency(paid - logged)}</p>
                            </li>
                        )}
                    </ol>
                )}
            </div>

            {/* Actions: one clear primary, the rest quiet */}
            <div className="space-y-2 pt-1">
                {!settled && (
                    <>
                        <button type="button" onClick={onSettle} disabled={!hasActivePeriod} className={PRIMARY_BTN}>
                            {isDebt
                                ? <><DollarSign className="w-4 h-4" /> Record payment</>
                                : <><HandCoins className="w-4 h-4" /> Record collection</>}
                        </button>
                        {!hasActivePeriod && (
                            <p className="text-center text-[11px] text-muted-ink">Open a pay period to record money moving.</p>
                        )}
                        {!isDebt && (
                            <button type="button" onClick={() => sendReminder(debt)} className={SECONDARY_BTN}>
                                <ShareIcon className="w-4 h-4" /> Send a reminder
                            </button>
                        )}
                    </>
                )}
                <div className="flex items-center justify-center gap-6 pt-1">
                    {!settled && (
                        <button type="button" onClick={onEdit} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-ink py-2">
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                    )}
                    <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-negative py-2">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                </div>
            </div>
        </div>
    )
}
