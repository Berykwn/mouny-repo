import { formatShortCurrency } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { dayDate, monthYear, relativeDays, shortDate } from '@/features/bills/lib/bill-labels'
import { PillButton, PlanRow, RowAmount } from '@/features/plan/components/layout'
import { dueStatus, type PayoffStop } from '../lib/debt-insights'
import { DebtAvatar } from './debt-avatar'

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))

/** "Due Thu 31 Dec" → "due Thu 31 Dec" mid-sentence; day and month names keep their capitals. */
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

function dueLine(debt: DebtWithAccount): { text: string; late: boolean } {
    const status = dueStatus(debt)
    if (status.kind === 'none') return { text: 'No due date', late: false }
    if (status.kind === 'overdue') return { text: `${status.days} day${status.days === 1 ? '' : 's'} late`, late: true }
    return { text: `Due ${dayDate(debt.due_date!)}`, late: false }
}

interface OweRowProps {
    debt: DebtWithAccount
    stop: PayoffStop | undefined
    canPay: boolean
    onOpen: () => void
    onPay: () => void
}

/**
 * A debt you owe, as a Bills row: this period's share to pay on the right while there is
 * one, otherwise what's left. How far along it is reads in the line under the name.
 */
export function OweRow({ debt, stop, canPay, onOpen, onPay }: OweRowProps) {
    const due = dueLine(debt)
    // The schedule's first step, so the row and the pay sheet's "This period's plan" agree.
    const planned = stop && stop.status !== 'overdue' ? stop : null
    const toPay = planned && !planned.doneThisPeriod ? planned.thisPeriodDue ?? 0 : 0
    const left = `${formatShortCurrency(debt.remaining_amount)} of ${formatShortCurrency(debt.total_amount)} left`
    const when = planned?.doneThisPeriod
        ? 'done for this period'
        : stop?.periodsLeft ? `${stop.periodsLeft} period${stop.periodsLeft === 1 ? '' : 's'} left`
            : stop?.date ? `~${monthYear(stop.date)}` : lowerFirst(due.text)

    return (
        <PlanRow
            lead={<DebtAvatar name={debt.counterparty} late={due.late} />}
            title={debt.counterparty}
            sub={due.late ? `${due.text} · ${left}` : `${left} · ${when}`}
            subClassName={due.late ? 'text-negative' : undefined}
            onOpen={onOpen}
            end={toPay > 0 && canPay
                ? <PillButton onClick={onPay}>Pay {formatShortCurrency(toPay)}</PillButton>
                : <RowAmount sub={`of ${plain(debt.total_amount)}`}>{plain(debt.remaining_amount)}</RowAmount>}
        />
    )
}

interface OwedRowProps {
    debt: DebtWithAccount
    canCollect: boolean
    onOpen: () => void
    onRemind: () => void
    onCollect: () => void
}

/** Money owed to you: who, when, and the one next step — a nudge once they're late, else collecting it. */
export function OwedRow({ debt, canCollect, onOpen, onRemind, onCollect }: OwedRowProps) {
    const due = dueLine(debt)
    const status = dueStatus(debt)
    const when = status.kind === 'soon' || status.kind === 'today' ? `${due.text} · ${relativeDays(status.kind === 'today' ? 0 : status.days)}` : due.text
    const lent = debt.created_at ? `lent ${shortDate(debt.created_at.slice(0, 10))}` : null

    return (
        <PlanRow
            lead={<DebtAvatar name={debt.counterparty} late={due.late} />}
            title={debt.counterparty}
            sub={[`${formatShortCurrency(debt.remaining_amount)} · ${lowerFirst(when)}`, lent].filter(Boolean).join(' · ')}
            subClassName={due.late ? 'text-negative' : undefined}
            onOpen={onOpen}
            end={due.late
                ? <PillButton onClick={onRemind}>Remind</PillButton>
                : <PillButton onClick={onCollect} disabled={!canCollect}>Collect</PillButton>}
        />
    )
}
