import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/features/categories/components/category-icon'
import type { TransactionWithDetails } from '@/types'

export function TransactionRow({ tx }: { tx: TransactionWithDetails }) {
    return (
        <div className="flex items-center gap-2.5 border-t border-surface-hover px-5 py-[9px]">
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
                <p className="truncate text-[13.5px] font-medium text-ink">
                    {tx.note ?? tx.category?.name ?? (tx.type === 'income' ? 'Income' : 'Expense')}
                </p>
                {tx.category && tx.note && (
                    <p className="truncate text-[11px] text-subtle-ink">{tx.category.name}</p>
                )}
            </div>
            <p className={cn(
                'text-[13.5px] tabular-nums shrink-0',
                tx.type === 'income' ? 'text-positive' : 'text-ink'
            )}>
                {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
            </p>
        </div>
    )
}
