import { formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { QuickTransactionWithCategory } from '@/types'

export function quickName(quick: Pick<QuickTransactionWithCategory, 'label' | 'category'>): string {
    return quick.label?.trim() || quick.category.name
}

interface QuickPillsProps {
    quicks: QuickTransactionWithCategory[]
    onPick: (quick: QuickTransactionWithCategory) => void
    disabled?: boolean
    className?: string
}

/** A scrolling row of "Parkir 2rb" pills; the dot is the category's color. */
export function QuickPills({ quicks, onPick, disabled, className }: QuickPillsProps) {
    return (
        <div className={cn('flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
            {quicks.map(quick => (
                <button
                    key={quick.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(quick)}
                    className="shrink-0 flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-full border border-line bg-surface text-[12.5px] text-ink hover:bg-surface-soft active:bg-surface-hover transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: quick.category.color ?? 'var(--subtle-ink)' }} />
                    <span className="max-w-[120px] truncate font-medium">{quickName(quick)}</span>
                    <span className={cn('tabular-nums', quick.category.type === 'income' ? 'text-positive' : 'text-muted-ink')}>
                        {formatShortCurrency(quick.amount)}
                    </span>
                </button>
            ))}
        </div>
    )
}
