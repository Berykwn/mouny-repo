import { formatCurrency, formatDate, daysUntil } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { Trash2, CreditCard, ArrowDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DebtListProps {
    debts: DebtWithAccount[]
    onDelete: (id: string) => void
    onPay: (debt: DebtWithAccount) => void
}

export function DebtList({ debts, onDelete, onPay }: DebtListProps) {
    if (debts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <p className="text-sm font-medium">Tidak ada hutang aktif</p>
                <p className="text-xs text-muted-foreground">Tap + untuk menambah catatan hutang</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {debts.map((debt) => {
                const paidPercent = Math.round(((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100)
                const days = debt.due_date ? daysUntil(debt.due_date) : null
                const isOverdue = days !== null && days < 0
                const isUrgent = days !== null && days >= 0 && days <= 7

                return (
                    <div key={debt.id} className="rounded-xl border bg-card p-4 space-y-3 group">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                    debt.type === 'debt' ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'
                                )}>
                                    {debt.type === 'debt'
                                        ? <CreditCard className="w-4 h-4 text-red-500" />
                                        : <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                                    }
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{debt.counterparty}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {debt.type === 'debt' ? 'Kamu berhutang' : 'Kamu dihutangi'}
                                        {debt.pay_from_account && ` · ${debt.pay_from_account.name}`}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">{formatCurrency(debt.remaining_amount)}</p>
                                <p className="text-xs text-muted-foreground">dari {formatCurrency(debt.total_amount)}</p>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-foreground rounded-full transition-all"
                                    style={{ width: `${paidPercent}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">{paidPercent}% terbayar</p>
                        </div>

                        {/* Bottom row */}
                        <div className="flex items-center justify-between">
                            <div>
                                {debt.due_date && (
                                    <p className={cn(
                                        'text-xs font-medium',
                                        isOverdue ? 'text-destructive' : isUrgent ? 'text-amber-500' : 'text-muted-foreground'
                                    )}>
                                        {isOverdue
                                            ? `Lewat ${Math.abs(days!)} hari`
                                            : days === 0
                                                ? 'Jatuh tempo hari ini!'
                                                : `Jatuh tempo ${formatDate(debt.due_date)}`
                                        }
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {debt.type === 'debt' && (
                                    <button
                                        onClick={() => onPay(debt)}
                                        className="text-xs px-2.5 py-1 rounded-md bg-foreground text-background font-medium hover:opacity-80 transition-opacity"
                                    >
                                        Bayar
                                    </button>
                                )}
                                <button
                                    onClick={() => onDelete(debt.id)}
                                    className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}