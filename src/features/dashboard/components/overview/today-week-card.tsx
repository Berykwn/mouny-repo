import { useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatDateShort, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { getTopExpenseCategory } from '../../lib/group-expenses-by-category'
import { useWeekSelector } from './use-week-selector'
import { TransactionRow } from './transaction-row'
import type { TransactionWithDetails } from '@/types'

type Tab = 'today' | 'week'

interface TodayWeekCardProps {
    transactions: TransactionWithDetails[]
    periodStart: string
    periodEnd: string | null
}

export function TodayWeekCard({ transactions, periodStart, periodEnd }: TodayWeekCardProps) {
    const navigate = useNavigate()
    const [tab, setTab] = useState<Tab>('today')
    const { weeks, weekIndex, currentWeek, goToPrev, goToNext, canGoPrev, canGoNext } = useWeekSelector(periodStart, periodEnd)

    const todayTxs = useMemo(() => {
        const today = toISODate()
        return transactions.filter(tx => tx.date.slice(0, 10) === today)
    }, [transactions])

    const weekTxs = useMemo(() => {
        return transactions.filter(tx => {
            const date = tx.date.slice(0, 10)
            return date >= currentWeek.start && date <= currentWeek.end
        })
    }, [transactions, currentWeek])

    const activeTxs = tab === 'today' ? todayTxs : weekTxs
    const topCategory = useMemo(() => getTopExpenseCategory(activeTxs), [activeTxs])

    return (
        <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2.5">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setTab('today')}
                        className={cn(
                            'text-[11px] uppercase tracking-[.14em] transition-colors',
                            tab === 'today' ? 'font-semibold text-ink' : 'font-normal text-muted-ink'
                        )}
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('week')}
                        className={cn(
                            'text-[11px] uppercase tracking-[.14em] transition-colors',
                            tab === 'week' ? 'font-semibold text-ink' : 'font-normal text-muted-ink'
                        )}
                    >
                        {weeks.length > 1 ? `Week ${weekIndex + 1}` : 'This Week'}
                    </button>
                </div>
                <button type="button" onClick={() => navigate('/transactions')} aria-label="View all transactions">
                    <ArrowRight className="h-[13px] w-[13px] text-muted-ink shrink-0" />
                </button>
            </div>

            {topCategory && (
                <p className="px-5 pb-2.5 text-[11px] text-subtle-ink">
                    Top: {topCategory.name} · {formatCurrency(topCategory.amount)}
                </p>
            )}

            {tab === 'week' && weeks.length > 1 && (
                <div className="flex items-center justify-between px-5 pb-2.5">
                    <button
                        type="button"
                        onClick={goToPrev}
                        disabled={!canGoPrev}
                        className="p-1 rounded-full disabled:opacity-30 text-muted-ink"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-[11px] text-muted-ink">
                        {formatDateShort(currentWeek.start)} – {formatDateShort(currentWeek.end)}
                    </p>
                    <button
                        type="button"
                        onClick={goToNext}
                        disabled={!canGoNext}
                        className="p-1 rounded-full disabled:opacity-30 text-muted-ink"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="max-h-[360px] overflow-y-auto">
                {activeTxs.length === 0 ? (
                    <p className="px-5 pb-4 text-[12px] text-muted-ink">
                        {tab === 'today' ? 'No transactions yet today.' : 'No transactions in this week.'}
                    </p>
                ) : (
                    activeTxs.map(tx => <TransactionRow key={tx.id} tx={tx} />)
                )}
            </div>
        </div>
    )
}
