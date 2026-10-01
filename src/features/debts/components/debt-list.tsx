import { formatCurrency, formatDate, formatShortCurrency } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/progress-bar'
import { debtProgress, duePill, dueStatus, sortByUrgency } from '../lib/debt-insights'
import { DebtAvatar } from './debt-avatar'

interface DebtListProps {
    title: string
    debts: DebtWithAccount[]
    /** Tapping a row opens its detail sheet, where pay / collect / delete live. */
    onOpen: (debt: DebtWithAccount) => void
}

function subline(debt: DebtWithAccount): string {
    const parts = [debt.due_date ? `Due ${formatDate(debt.due_date)}` : 'No due date']
    if (debt.pay_from_account) parts.push(debt.pay_from_account.name)
    return parts.join(' · ')
}

/** One side of the ledger (you owe / owed to you), most urgent first. */
export function DebtList({ title, debts, onOpen }: DebtListProps) {
    if (debts.length === 0) return null
    const total = debts.reduce((s, d) => s + d.remaining_amount, 0)
    const isDebt = debts[0].type === 'debt'

    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between px-1">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">{title}</p>
                <p className="text-[11px] text-muted-ink tabular-nums">{formatShortCurrency(total)}</p>
            </div>

            <div className="card overflow-hidden divide-y divide-line-soft">
                {sortByUrgency(debts).map((debt) => {
                    const { percent } = debtProgress(debt)
                    const pill = duePill(dueStatus(debt))

                    return (
                        <button
                            key={debt.id}
                            type="button"
                            onClick={() => onOpen(debt)}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-surface-soft active:bg-surface-hover"
                        >
                            <div className="flex items-center gap-3">
                                <DebtAvatar name={debt.counterparty} type={debt.type} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-[13px] font-medium text-ink truncate">{debt.counterparty}</p>
                                        {pill && (
                                            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', pill.className)}>
                                                {pill.label}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-ink truncate">{subline(debt)}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[13px] font-medium tabular-nums text-ink">
                                        {formatCurrency(debt.remaining_amount)}
                                    </p>
                                    {percent > 0 && (
                                        <p className="text-[10.5px] text-muted-ink tabular-nums">
                                            of {formatShortCurrency(debt.total_amount)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {percent > 0 && (
                                <div className="mt-2.5 pl-12 flex items-center gap-2">
                                    <ProgressBar
                                        percent={percent}
                                        color={isDebt ? 'var(--negative)' : 'var(--positive)'}
                                        className="flex-1"
                                    />
                                    <span className="text-[10.5px] text-muted-ink tabular-nums shrink-0">
                                        {percent}% {isDebt ? 'paid' : 'back'}
                                    </span>
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
