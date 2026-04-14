import { formatCurrency, formatDate, daysUntil } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { DollarSign, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface DebtListProps {
    debts: DebtWithAccount[]
    onDelete: (debt: DebtWithAccount) => void
    onPay: (debt: DebtWithAccount) => void
}

export function DebtList({ debts, onDelete, onPay }: DebtListProps) {
    if (debts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <p className="text-sm font-medium">No active debts</p>
                <p className="text-xs text-muted-foreground">Tap + to add a debt record</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {debts.map((debt) => {
                const paidAmount = debt.total_amount - debt.remaining_amount
                const paidPercent = Math.round((paidAmount / debt.total_amount) * 100)
                const days = debt.due_date ? daysUntil(debt.due_date) : null
                const isOverdue = days !== null && days < 0
                const isUrgent = days !== null && days >= 0 && days <= 7
                const isDebt = debt.type === 'debt'
                const variant = isOverdue ? 'destructive' : isUrgent ? 'secondary' : 'outline'

                return (
                    <div key={debt.id} className="rounded-xl border bg-card p-4 space-y-3">

                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium truncate">{debt.counterparty}</p>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'text-[10px] font-medium px-1.5 py-0.5',
                                            isDebt
                                                ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 dark:text-red-400'
                                                : 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 dark:text-green-400'
                                        )}
                                    >
                                        {isDebt ? 'Debt' : 'Receivable'}
                                    </Badge>
                                </div>
                                {debt.pay_from_account && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        via {debt.pay_from_account.name}
                                    </p>
                                )}
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">{formatCurrency(debt.remaining_amount)}</p>
                                <p className="text-[11px] text-muted-foreground">of {formatCurrency(debt.total_amount)}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                <Progress
                                    value={paidPercent}
                                    className={cn(
                                        'h-1',
                                        isDebt ? '[&>div]:bg-foreground' : '[&>div]:bg-green-500'
                                    )}
                                />
                            </div>
                            <p className="text-[11px] text-muted-foreground">{paidPercent}% paid</p>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <div>
                                {debt.due_date ? (
                                    <Badge variant={variant} className="text-xs">
                                        {isOverdue ? `${Math.abs(days!)} days overdue` : days === 0 ? 'Due today' : `Due ${formatDate(debt.due_date)}`}
                                    </Badge>
                                ) : (
                                    <Badge variant={variant} className="text-xs">
                                        No due date
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                {isDebt && (
                                    <Button variant="outline" size="sm" onClick={() => onPay(debt)}>
                                        <DollarSign className="w-3.5 h-3.5 mr-1 mt-0.5" />
                                        Pay
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => onDelete(debt)}>
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