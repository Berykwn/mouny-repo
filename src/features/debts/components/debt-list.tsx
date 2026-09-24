import { useState } from 'react'
import { formatCurrency, formatDate, daysUntil } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { DollarSign, Trash2, HandCoins, ChevronDown } from 'lucide-react'
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
    const [openIds, setOpenIds] = useState<Set<string>>(new Set())

    const toggle = (id: string) => {
        setOpenIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    return (
        <div className="card overflow-hidden divide-y divide-line-soft">
            {debts.map((debt) => {
                const paidAmount = debt.total_amount - debt.remaining_amount
                const paidPercent = Math.round((paidAmount / debt.total_amount) * 100)
                const days = debt.due_date ? daysUntil(debt.due_date) : null
                const isOverdue = days !== null && days < 0
                const isUrgent = days !== null && days >= 0 && days <= 7
                const isDebt = debt.type === 'debt'
                const isOpen = openIds.has(debt.id)

                const dueDatePillClass = isOverdue
                    ? 'bg-negative/10 text-negative'
                    : isUrgent
                        ? 'bg-warning/10 text-warning'
                        : 'bg-surface-hover text-muted-ink'

                return (
                    <div
                        key={debt.id}
                        className={cn('transition-colors duration-200', isOpen && 'bg-surface-hover')}
                    >
                        <button
                            onClick={() => toggle(debt.id)}
                            className={cn(
                                'w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors',
                                !isOpen && 'hover:bg-surface-soft'
                            )}
                        >
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
                                <p className={cn(
                                    'text-[11.5px] mt-0.5',
                                    isDebt ? 'text-negative' : 'text-positive'
                                )}>
                                    {formatCurrency(debt.remaining_amount)}
                                    <span className="text-muted-ink"> of {formatCurrency(debt.total_amount)}</span>
                                </p>
                            </div>

                            <ChevronDown className={cn(
                                'w-3.5 h-3.5 text-muted-ink transition-transform shrink-0',
                                isOpen && 'rotate-180'
                            )} />
                        </button>

                        {isOpen && (
                            <div className="px-4 pb-4 pt-1 space-y-3">
                                {debt.pay_from_account && (
                                    <p className="text-[11.5px] text-muted-ink">
                                        via {debt.pay_from_account.name}
                                    </p>
                                )}

                                <div className="space-y-1">
                                    <ProgressBar percent={paidPercent} color={isDebt ? 'var(--negative)' : 'var(--positive)'} />
                                    <p className="text-[11px] text-muted-ink">{paidPercent}% {isDebt ? 'paid' : 'collected'}</p>
                                </div>

                                {debt.notes && (
                                    <p className="text-[11.5px] text-muted-ink font-medium">{debt.notes}</p>
                                )}

                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-line-soft">
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
                        )}
                    </div>
                )
            })}
        </div>
    )
}
