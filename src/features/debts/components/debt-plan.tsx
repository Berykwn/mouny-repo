import FlagIcon from '~icons/ph/flag-checkered-duotone'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { formatMonthYear, type SavingsPace } from '@/features/wish-list/lib/wish-analytics'
import type { DebtWithAccount } from '@/types'
import type { PayoffPlan, PayoffStatus } from '../lib/debt-insights'
import { DebtAvatar } from './debt-avatar'

const STATUS_PILL: Record<PayoffStatus, { label: string; className: string } | null> = {
    'on-track': { label: 'On track', className: 'bg-positive/10 text-positive' },
    'behind': { label: 'Tight', className: 'bg-warning/10 text-warning' },
    'overdue': { label: 'Overdue', className: 'bg-negative/10 text-negative' },
    'unknown': null,
    'no-date': null,
}

interface DebtPlanProps {
    plan: PayoffPlan
    pace: SavingsPace | null
    onOpen: (debt: DebtWithAccount) => void
}

/** When you'll be debt-free, and what to set aside this period to stay on schedule. */
export function DebtPlan({ plan, pace, onOpen }: DebtPlanProps) {
    if (plan.stops.length === 0) return null

    let headline: string
    let detail: string
    if (!pace) {
        headline = 'No estimate yet'
        detail = 'Close your first period and Mouny will estimate when you’ll be debt-free.'
    } else if (pace.perDay <= 0) {
        headline = 'No estimate yet'
        detail = 'Recent periods left nothing over, so there’s nothing to pay debts down with yet.'
    } else if (plan.debtFreeDate) {
        headline = `Debt-free by ${formatMonthYear(plan.debtFreeDate)}`
        detail = `If your usual ${formatShortCurrency(Math.round(pace.perPeriod))} left over per period goes to debts first.`
    } else {
        headline = 'More than 10 years out'
        detail = `At ${formatShortCurrency(Math.round(pace.perPeriod))} left over per period, this will take a long time. Paying a bit more each period helps.`
    }

    return (
        <div className="card overflow-hidden">
            <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                <div className="w-10 h-10 rounded-[12px] bg-info/10 text-info flex items-center justify-center shrink-0">
                    <FlagIcon className="w-[22px] h-[22px]" />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Payoff plan</p>
                    <p className="text-[15px] font-medium tracking-[-0.01em] text-ink mt-0.5">{headline}</p>
                    <p className="text-[11.5px] text-muted-ink leading-relaxed mt-0.5">{detail}</p>
                </div>
            </div>

            {plan.thisPeriod > 0 && (
                <div className="mx-4 mb-3 rounded-[14px] bg-surface-soft border border-line-soft px-3 py-2.5 flex items-center justify-between gap-3">
                    <p className="text-[11.5px] text-muted-ink">Set aside this period to meet due dates</p>
                    <p className="text-[13px] font-medium text-ink tabular-nums shrink-0">{formatCurrency(plan.thisPeriod)}</p>
                </div>
            )}

            <ol className="border-t border-line-soft divide-y divide-line-soft">
                {plan.stops.map((stop, i) => {
                    const pill = STATUS_PILL[stop.status]
                    return (
                        <li key={stop.debt.id}>
                            <button
                                type="button"
                                onClick={() => onOpen(stop.debt)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-soft"
                            >
                                <span className="w-4 text-[11px] text-subtle-ink tabular-nums shrink-0">{i + 1}</span>
                                <DebtAvatar name={stop.debt.counterparty} type="debt" className="w-8 h-8 text-[11px]" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-medium text-ink truncate">{stop.debt.counterparty}</p>
                                    <p className="text-[10.5px] text-muted-ink truncate">
                                        {stop.date ? `Paid off ~${formatMonthYear(stop.date)}` : 'No estimate'}
                                        {stop.perPeriodNeeded !== null && stop.status !== 'overdue' && (
                                            <> · {formatShortCurrency(Math.ceil(stop.perPeriodNeeded))}/period</>
                                        )}
                                    </p>
                                </div>
                                {pill && (
                                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', pill.className)}>
                                        {pill.label}
                                    </span>
                                )}
                            </button>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
