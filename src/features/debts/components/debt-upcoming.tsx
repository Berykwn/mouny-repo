import { formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { DebtWithAccount } from '@/types'
import { dueStatus, UPCOMING_DAYS } from '../lib/debt-insights'

interface DebtUpcomingProps {
    debts: DebtWithAccount[]
    onOpen: (debt: DebtWithAccount) => void
}

function dateParts(date: string) {
    const d = new Date(date + 'T00:00:00')
    return {
        day: d.getDate(),
        month: d.toLocaleDateString('en-GB', { month: 'short' }),
    }
}

/** A short timeline of what falls due in the next month, both directions. */
export function DebtUpcoming({ debts, onOpen }: DebtUpcomingProps) {
    if (debts.length === 0) return null

    return (
        <div className="card overflow-hidden">
            <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Coming up</p>
                <p className="text-[10.5px] text-subtle-ink">next {UPCOMING_DAYS} days</p>
            </div>
            <ol className="relative px-4 pb-3">
                {/* The timeline's spine, behind the date badges */}
                <span aria-hidden className="absolute left-[38px] top-3 bottom-6 w-px bg-line-soft" />
                {debts.map(debt => {
                    const { day, month } = dateParts(debt.due_date!)
                    const status = dueStatus(debt)
                    const isDebt = debt.type === 'debt'
                    const late = status.kind === 'overdue'
                    const soon = status.kind === 'today' || status.kind === 'soon'
                    return (
                        <li key={debt.id}>
                            <button
                                type="button"
                                onClick={() => onOpen(debt)}
                                className="relative w-full flex items-center gap-3 py-1.5 text-left rounded-[12px] hover:bg-surface-soft transition-colors"
                            >
                                <div className={cn(
                                    'w-11 h-11 rounded-[12px] flex flex-col items-center justify-center shrink-0 border leading-none',
                                    late ? 'bg-negative/10 border-negative/20 text-negative'
                                        : soon ? 'bg-warning/10 border-warning/20 text-warning'
                                            : 'bg-white border-line text-ink'
                                )}>
                                    <span className="text-[15px] font-semibold tabular-nums">{day}</span>
                                    <span className="text-[9.5px] uppercase tracking-[.08em] mt-0.5">{month}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-medium text-ink truncate">
                                        {isDebt ? `Pay ${debt.counterparty}` : `${debt.counterparty} pays you`}
                                    </p>
                                    <p className={cn('text-[10.5px]', late ? 'text-negative' : soon ? 'text-warning' : 'text-muted-ink')}>
                                        {late ? `${status.days} day${status.days === 1 ? '' : 's'} overdue`
                                            : status.kind === 'today' ? 'Today'
                                                : status.kind === 'none' ? '' : `In ${status.days} day${status.days === 1 ? '' : 's'}`}
                                    </p>
                                </div>
                                <p className={cn('text-[12.5px] font-medium tabular-nums shrink-0 pr-1', isDebt ? 'text-ink' : 'text-positive')}>
                                    {isDebt ? '−' : '+'}{formatShortCurrency(debt.remaining_amount)}
                                </p>
                            </button>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
