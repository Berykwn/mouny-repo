import { useEffect, useMemo, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/helpers'
import type { PayPeriod } from '@/types'
import { History, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { transactionsService } from '@/services/transactions.service'

interface PeriodHistoryProps {
    periods: PayPeriod[]
}

type Summary = { income: number; expense: number; net: number }

export function PeriodHistory({ periods }: PeriodHistoryProps) {
    const closed = useMemo(() => periods.filter(p => p.status === 'closed'), [periods])
    const [summaryMap, setSummaryMap] = useState<Record<string, Summary>>({})
    const [openId, setOpenId] = useState<string | null>(null)

    useEffect(() => {
        if (closed.length === 0) return
        const load = async () => {
            const results: Record<string, Summary> = {}
            for (const p of closed) {
                const { data } = await transactionsService.getPeriodSummary(p.id)
                results[p.id] = data ?? { income: 0, expense: 0, net: 0 }
            }
            setSummaryMap(results)
        }
        load()
    }, [periods])

    if (closed.length === 0) return null

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Period History</p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden divide-y divide-neutral-100">
                {closed.map((p) => {
                    const summary = summaryMap[p.id]
                    const isOpen = openId === p.id

                    return (
                        <div key={p.id}>
                            <button
                                onClick={() => setOpenId(isOpen ? null : p.id)}
                                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent transition-colors"
                            >
                                <div className="text-left">
                                    <p className="text-xs font-medium">
                                        {formatDate(p.start_date)}
                                        {p.end_date && ` — ${formatDate(p.end_date)}`}
                                    </p>
                                    <p className={cn(
                                        'text-xs mt-0.5',
                                        !summary ? 'text-muted-foreground' :
                                        summary.net >= 0 ? 'text-green-600' : 'text-destructive'
                                    )}>
                                        {summary ? formatCurrency(summary.net) : '—'}
                                    </p>
                                </div>
                                <ChevronDown className={cn(
                                    'w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0',
                                    isOpen && 'rotate-180'
                                )} />
                            </button>

                            {isOpen && (
                                <div className="px-4 pb-4 pt-1 space-y-3 bg-muted/20">
                                    <div className="flex justify-between text-xs">
                                        <div>
                                            <p className="text-muted-foreground">Salary</p>
                                            <p className="font-medium mt-0.5">{formatCurrency(p.salary_amount)}</p>
                                        </div>
                                        {p.closing_balance !== null && (
                                            <div className="text-right">
                                                <p className="text-muted-foreground">Closing</p>
                                                <p className={cn('font-medium mt-0.5', p.closing_balance >= 0 ? 'text-green-600' : 'text-destructive')}>
                                                    {formatCurrency(p.closing_balance)}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-neutral-200">
                                        <div>
                                            <p className="text-muted-foreground">Income</p>
                                            <p className="font-medium text-green-600 mt-0.5">{summary ? formatCurrency(summary.income) : '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Expense</p>
                                            <p className="font-medium text-destructive mt-0.5">{summary ? formatCurrency(summary.expense) : '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Net</p>
                                            <p className={cn('font-medium mt-0.5', summary?.net >= 0 ? 'text-green-600' : 'text-destructive')}>
                                                {summary ? formatCurrency(summary.net) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {p.notes && (
                                        <p className="text-xs text-muted-foreground">{p.notes}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}