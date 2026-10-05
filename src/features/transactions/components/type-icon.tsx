import { ArrowLeftRight, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isTransfer } from '@/lib/transaction-type'

/** Stands in for a category icon on rows without a category. */
export function TypeIcon({ type, className = 'w-[18px] h-[18px]' }: { type: string; className?: string }) {
    if (isTransfer(type)) return <ArrowLeftRight className={cn(className, 'text-muted-ink')} />
    return type === 'income'
        ? <TrendingUp className={cn(className, 'text-positive')} />
        : <TrendingDown className={cn(className, 'text-negative')} />
}
