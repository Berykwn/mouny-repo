import ReceiptIcon from '~icons/ph/receipt-duotone'
import RepeatIcon from '~icons/ph/repeat-duotone'
import { useCategories } from '@/queries'
import { ICON_MAP } from '@/lib/icon-map'
import { cn } from '@/lib/utils'
import type { RecurringBill } from '@/types'

interface BillTileProps {
    bill: Pick<RecurringBill, 'kind' | 'category_id' | 'paused'>
    /** Small, for a table row. */
    size?: 'sm' | 'md'
    className?: string
}

/** A bill's icon, from its category when it has one, on a soft cobalt tile; grey when paused. */
export function BillTile({ bill, size = 'md', className }: BillTileProps) {
    const { data: categories } = useCategories('expense')
    const iconName = categories?.find(c => c.id === bill.category_id)?.icon
    const Icon = (iconName && ICON_MAP[iconName]) || (bill.kind === 'subscription' ? RepeatIcon : ReceiptIcon)
    return (
        <span className={cn(
            'flex items-center justify-center shrink-0',
            size === 'sm' ? 'w-8 h-8 rounded-[10px]' : 'w-10 h-10 rounded-[12px]',
            bill.paused ? 'bg-surface-hover text-muted-ink' : 'bg-brand-tint text-brand-ink',
            className
        )}>
            <Icon className={size === 'sm' ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]'} />
        </span>
    )
}
