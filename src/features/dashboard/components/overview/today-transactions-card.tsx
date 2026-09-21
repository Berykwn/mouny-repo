import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/features/categories/components/category-icon'
import type { TransactionWithDetails } from '@/types'

interface TodayTransactionsCardProps {
    transactions: TransactionWithDetails[]
}

export function TodayTransactionsCard({ transactions }: TodayTransactionsCardProps) {
    const navigate = useNavigate()

    const todayTxs = useMemo(() => {
        const today = toISODate()
        return transactions.filter(tx => toISODate(new Date(tx.date)) === today)
    }, [transactions])

    return (
        <div className="rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden">
            <button
                type="button"
                onClick={() => navigate('/transactions')}
                className="flex w-full items-center justify-between px-5 pt-4 pb-3 text-left"
            >
                <p className="text-[11px] font-normal uppercase tracking-[.14em] text-[#8a8a84]">
                    Today
                </p>
                <ArrowRight className="h-[13px] w-[13px] text-[#8a8a84]" />
            </button>

            {todayTxs.length === 0 ? (
                <p className="px-5 pb-4 text-[12px] text-[#8a8a84]">No transactions yet today.</p>
            ) : (
                todayTxs.map(tx => (
                    <div
                        key={tx.id}
                        className="flex items-center gap-2.5 border-t border-[#f4f4f2] px-5 py-[9px]"
                    >
                        <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
                            style={{ backgroundColor: `${tx.category?.color ?? '#94a3b8'}1f` }}
                        >
                            <CategoryIcon
                                name={tx.category?.icon}
                                className="h-4 w-4"
                                style={{ color: tx.category?.color ?? '#94a3b8' }}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-medium text-[#252525]">
                                {tx.note ?? tx.category?.name ?? (tx.type === 'income' ? 'Income' : 'Expense')}
                            </p>
                            {tx.category && tx.note && (
                                <p className="truncate text-[11px] text-[#a3a3a3]">{tx.category.name}</p>
                            )}
                        </div>
                        <p className={cn(
                            'text-[13.5px] tabular-nums shrink-0',
                            tx.type === 'income' ? 'text-[#059669]' : 'text-[#252525]'
                        )}>
                            {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
                        </p>
                    </div>
                ))
            )}
        </div>
    )
}
