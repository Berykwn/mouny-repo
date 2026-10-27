import { MessageCircle } from 'lucide-react'
import { formatShortCurrency } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { dayDate, monthYear, relativeDays, shortDate } from '@/features/bills/lib/bill-labels'
import { debtProgress, dueStatus, type PayoffStop } from '../lib/debt-insights'
import { DebtAvatar } from './debt-avatar'

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))
const QUIET_BTN = 'flex-1 h-10 rounded-[12px] bg-surface-hover text-ink text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-line-soft transition-colors disabled:opacity-50'

function dueLine(debt: DebtWithAccount): { text: string; late: boolean } {
    const status = dueStatus(debt)
    if (status.kind === 'none') return { text: 'No due date', late: false }
    if (status.kind === 'overdue') return { text: `${status.days} day${status.days === 1 ? '' : 's'} late`, late: true }
    return { text: `Due ${dayDate(debt.due_date!)}`, late: false }
}

interface OweCardProps {
    debt: DebtWithAccount
    stop: PayoffStop | undefined
    onOpen: () => void
}

/** A debt you owe: what's left, a thin ink bar of what's paid, and how many periods remain. */
export function OweCard({ debt, stop, onOpen }: OweCardProps) {
    const { percent } = debtProgress(debt)
    const due = dueLine(debt)
    // The schedule's first step, so the card and the pay sheet's "This period's plan" agree.
    const planned = stop && stop.status !== 'overdue' ? stop : null
    const sub = planned?.doneThisPeriod
        ? `Done for this period · ${due.text.toLowerCase()}`
        : planned?.thisPeriodDue
            ? `${formatShortCurrency(planned.thisPeriodDue)} this period · ${due.text.toLowerCase()}`
            : due.text
    const foot = stop?.periodsLeft
        ? `${stop.periodsLeft} period${stop.periodsLeft === 1 ? '' : 's'} left`
        : stop?.date ? `~${monthYear(stop.date)} at your pace` : null

    return (
        <button type="button" onClick={onOpen} className="card w-full p-4 text-left hover:bg-surface-soft transition-colors">
            <div className="flex items-center gap-3">
                <DebtAvatar name={debt.counterparty} late={due.late} />
                <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-ink truncate">{debt.counterparty}</p>
                    <p className={due.late ? 'text-[12px] text-negative truncate' : 'text-[12px] text-muted-ink truncate'}>{sub}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[15px] font-semibold tabular-nums text-ink">{plain(debt.remaining_amount)}</p>
                    <p className="text-[11.5px] text-subtle-ink tabular-nums">of {plain(debt.total_amount)}</p>
                </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-line-soft overflow-hidden">
                <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-2 flex justify-between gap-3 text-[12px] text-muted-ink">
                <span className="tabular-nums">{percent}% paid</span>
                {foot && <span className="truncate">{foot}</span>}
            </div>
        </button>
    )
}

interface OwedCardProps {
    debt: DebtWithAccount
    canCollect: boolean
    onOpen: () => void
    onRemind: () => void
    onCollect: () => void
}

/** Money owed to you: who, how late, and the two things to do about it. */
export function OwedCard({ debt, canCollect, onOpen, onRemind, onCollect }: OwedCardProps) {
    const due = dueLine(debt)
    const lent = debt.created_at ? `lent ${shortDate(debt.created_at.slice(0, 10))}` : null
    const status = dueStatus(debt)
    const when = status.kind === 'soon' || status.kind === 'today' ? `${due.text} · ${relativeDays(status.kind === 'today' ? 0 : status.days)}` : due.text

    return (
        <div className="card p-4">
            <button type="button" onClick={onOpen} className="w-full flex items-center gap-3 text-left">
                <DebtAvatar name={debt.counterparty} late={due.late} />
                <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-ink truncate">{debt.counterparty}</p>
                    <p className={due.late ? 'text-[12px] text-negative truncate' : 'text-[12px] text-muted-ink truncate'}>
                        {[when, lent].filter(Boolean).join(' · ')}
                    </p>
                </div>
                <p className="text-[15px] font-semibold tabular-nums text-ink shrink-0">{plain(debt.remaining_amount)}</p>
            </button>
            <div className="mt-3 flex gap-2">
                <button type="button" onClick={onRemind} className={QUIET_BTN}>
                    <MessageCircle className="w-4 h-4" /> Remind
                </button>
                <button type="button" onClick={onCollect} disabled={!canCollect} className={QUIET_BTN}>
                    Collect
                </button>
            </div>
            {debt.notes && <p className="mt-2 text-[11.5px] text-subtle-ink truncate">{debt.notes}</p>}
        </div>
    )
}
