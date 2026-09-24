import { formatCurrency, formatDate, daysUntil } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { DollarSign, Trash2, HandCoins } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/progress-bar'

interface DebtListProps {
    debts: DebtWithAccount[]
    onDelete: (debt: DebtWithAccount) => void
    onPay: (debt: DebtWithAccount) => void
    onCollect: (debt: DebtWithAccount) => void
}

export function DebtList({ debts, onDelete, onPay, onCollect }: DebtListProps) {
    return (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {debts.map((debt) => {
                const paidAmount = debt.total_amount - debt.remaining_amount
                const paidPercent = Math.round((paidAmount / debt.total_amount) * 100)
                const days = debt.due_date ? daysUntil(debt.due_date) : null
                const isOverdue = days !== null && days < 0
                const isUrgent = days !== null && days >= 0 && days <= 7
                const isDebt = debt.type === 'debt'

                const dueDatePillClass = isOverdue
                    ? 'bg-negative/10 text-negative'
                    : isUrgent
                        ? 'bg-warning/10 text-warning'
                        : 'bg-surface-hover text-muted-ink'

                return (
                    <div key={debt.id} className="card p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[13px] font-medium text-ink truncate">{debt.counterparty}</p>
                                    <span className={cn(
                                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                                        isDebt ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'
                                    )}>
                                        {isDebt ? 'Debt' : 'Receivable'}
                                    </span>
                                </div>
                                {debt.pay_from_account && (
                                    <p className="text-[11.5px] text-muted-ink mt-0.5">
                                        via {debt.pay_from_account.name}
                                    </p>
                                )}
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-[13px] font-medium text-ink">{formatCurrency(debt.remaining_amount)}</p>
                                <p className="text-[11px] text-muted-ink">of {formatCurrency(debt.total_amount)}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <ProgressBar percent={paidPercent} color={isDebt ? 'var(--negative)' : 'var(--positive)'} />
                            <p className="text-[11px] text-muted-ink">{paidPercent}% {isDebt ? 'paid' : 'collected'}</p>
                            {debt.notes && (
                                <div className='pt-2.5 pb-1.5'>
                                    <p className='text-[11.5px] text-muted-ink font-medium'>{debt.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <span className={cn('text-[11px] font-medium px-2 py-1 rounded-full', dueDatePillClass)}>
                                {debt.due_date
                                    ? (isOverdue ? `${Math.abs(days!)} days overdue` : days === 0 ? 'Due today' : `Due ${formatDate(debt.due_date)}`)
                                    : 'No due date'}
                            </span>

                            <div className="flex items-center gap-1">
                                {isDebt ? (
                                    <Button variant="outline" size="sm" className="rounded-[10px]" onClick={() => onPay(debt)}>
                                        <DollarSign className="w-3.5 h-3.5 mr-1 mt-0.5" />
                                        Pay
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" className="rounded-[10px]" onClick={() => onCollect(debt)}>
                                        <HandCoins className="w-3.5 h-3.5 mr-1 mt-0.5" />
                                        Collect
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" className="rounded-[10px]" onClick={() => onDelete(debt)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
