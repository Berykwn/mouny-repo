import { useEffect, useMemo, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/helpers'
import type { PayPeriod } from '@/types'
import { History, ChevronDown, Wallet, StickyNote } from 'lucide-react'
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
    }, [closed])

    if (closed.length === 0) return null

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
                <History className="w-3.5 h-3.5 text-muted-ink" />
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Period History</p>
            </div>

            <div className="card overflow-hidden divide-y divide-line-soft">
                {closed.map((p) => {
                    const summary = summaryMap[p.id]
                    const isOpen = openId === p.id

                    return (
                        <div
                            key={p.id}
                            className={cn('transition-colors duration-200', isOpen && 'bg-surface-hover')}
                        >
                            <button
                                onClick={() => setOpenId(isOpen ? null : p.id)}
                                className={cn(
                                    'w-full flex items-center justify-between px-4 py-3.5 transition-colors',
                                    !isOpen && 'hover:bg-surface-soft'
                                )}
                            >
                                <div className="text-left">
                                    <p className="text-[11.5px] font-medium text-ink">
                                        {formatDate(p.start_date)}
                                        {p.end_date && ` — ${formatDate(p.end_date)}`}
                                    </p>
                                    <p className={cn(
                                        'text-[11.5px] mt-0.5',
                                        !summary ? 'text-muted-ink' : summary.net >= 0 ? 'text-positive' : 'text-negative'
                                    )}>
                                        {summary ? formatCurrency(summary.net) : '—'}
                                    </p>
                                </div>

                                <div>
                                    <ChevronDown className={cn(
                                        'w-3.5 h-3.5 text-muted-ink transition-transform shrink-0',
                                        isOpen && 'rotate-180'
                                    )} />
                                </div>
                            </button>

                            {isOpen && (
                                <div className="px-4 pb-4 pt-1 space-y-3">
                                    {/* Salary & Closing Balance */}
                                    <div className="flex justify-between text-[11.5px]">
                                        <div>
                                            <p className="text-muted-ink flex items-center gap-1">
                                                <Wallet className="w-3 h-3" /> Salary
                                            </p>
                                            <p className="font-medium text-ink mt-0.5">{formatCurrency(p.salary_amount)}</p>
                                        </div>
                                        {p.closing_balance !== null && (
                                            <div className="text-right">
                                                <p className="text-muted-ink">Closing Balance</p>
                                                <p className={cn('font-medium mt-0.5', p.closing_balance >= 0 ? 'text-positive' : 'text-negative')}>
                                                    {formatCurrency(p.closing_balance)}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Income / Expense / Net */}
                                    <div className="grid grid-cols-3 gap-2 text-[11.5px] pt-2 border-t border-line-soft">
                                        <div className="bg-positive/10 rounded-[10px] px-2.5 py-2">
                                            <p className="text-muted-ink">Income</p>
                                            <p className="font-semibold text-positive mt-0.5">
                                                {summary ? formatCurrency(summary.income) : '—'}
                                            </p>
                                        </div>
                                        <div className="bg-negative/10 rounded-[10px] px-2.5 py-2">
                                            <p className="text-muted-ink">Expense</p>
                                            <p className="font-semibold text-negative mt-0.5">
                                                {summary ? formatCurrency(summary.expense) : '—'}
                                            </p>
                                        </div>
                                        <div className={cn(
                                            'rounded-[10px] px-2.5 py-2',
                                            summary?.net >= 0 ? 'bg-positive/10' : 'bg-negative/10'
                                        )}>
                                            <p className="text-muted-ink">Net</p>
                                            <p className={cn('font-semibold mt-0.5', summary?.net >= 0 ? 'text-positive' : 'text-negative')}>
                                                {summary ? formatCurrency(summary.net) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {p.notes && (
                                        <div className="flex items-start gap-1.5 text-[11.5px] text-muted-ink bg-surface-hover rounded-[14px] px-3 py-2">
                                            <StickyNote className="w-3 h-3 shrink-0 mt-0.5" />
                                            <p>{p.notes}</p>
                                        </div>
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
