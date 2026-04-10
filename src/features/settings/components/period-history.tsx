import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/helpers'
import type { PayPeriod } from '@/types'
import { History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { transactionsService } from '@/services/transactions.service'

interface PeriodHistoryProps {
    periods: PayPeriod[]
}

type Summary = {
    income: number
    expense: number
    net: number
}

export function PeriodHistory({ periods }: PeriodHistoryProps) {
    const closed = periods.filter(p => p.status === 'closed')

    const [summaryMap, setSummaryMap] = useState<Record<string, Summary>>({})

    useEffect(() => {
        if (closed.length === 0) return

        const load = async () => {
            const results: Record<string, Summary> = {}

            for (const p of closed) {
                const { data } = await transactionsService.getPeriodSummary(p.id)

                results[p.id] = data ?? {
                    income: 0,
                    expense: 0,
                    net: 0,
                }
            }

            setSummaryMap(results)
        }

        load()
    }, [closed])

    if (closed.length === 0) return null

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Period History</p>
            </div>

            <div className="space-y-2">
                {closed.map((p) => {
                    const summary = summaryMap[p.id]

                    return (
                        <div key={p.id} className="rounded-xl border bg-card p-4 space-y-3">

                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                    {formatDate(p.start_date)}
                                    {p.end_date && ` — ${formatDate(p.end_date)}`}
                                </p>

                                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                                    Closed
                                </span>
                            </div>

                            {/* Salary + Closing */}
                            <div className="flex justify-between gap-2 text-xs">
                                <div>
                                    <p className="text-muted-foreground">Salary</p>
                                    <p className="font-medium">
                                        {formatCurrency(p.salary_amount)}
                                    </p>
                                </div>

                                {p.closing_balance !== null && (
                                    <div>
                                        <p className="text-muted-foreground">Closing Balance</p>
                                        <p
                                            className={cn(
                                                'font-medium',
                                                p.closing_balance >= 0
                                                    ? 'text-green-600'
                                                    : 'text-destructive'
                                            )}
                                        >
                                            {formatCurrency(p.closing_balance)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Summary Income / Expense / Net */}
                            <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t">
                                <div>
                                    <p className="text-muted-foreground">Income</p>
                                    <p className="font-medium text-green-600">
                                        {summary ? formatCurrency(summary.income) : '-'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-muted-foreground">Expense</p>
                                    <p className="font-medium text-destructive">
                                        {summary ? formatCurrency(summary.expense) : '-'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-muted-foreground">Net</p>
                                    <p
                                        className={cn(
                                            'font-medium',
                                            summary?.net >= 0
                                                ? 'text-green-600'
                                                : 'text-destructive'
                                        )}
                                    >
                                        {summary ? formatCurrency(summary.net) : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Notes */}
                            {p.notes && (
                                <p className="text-xs text-muted-foreground pt-1">
                                    {p.notes}
                                </p>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}