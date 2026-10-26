import { RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RetryInlineProps {
    /** What didn't load, e.g. "Your accounts". */
    what: string
    onRetry: () => void
    retrying?: boolean
    className?: string
}

/** A failed load, said where its data would be, with Retry right there. */
export function RetryInline({ what, onRetry, retrying = false, className }: RetryInlineProps) {
    return (
        <div role="alert" className={cn('flex items-center gap-3 rounded-[16px] border border-line px-4 py-3', className)}>
            <p className="flex-1 min-w-0 text-[13px] text-muted-ink">
                <span className="font-medium text-ink">{what} didn’t load.</span> Check your connection and try again.
            </p>
            <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className="h-9 px-3 rounded-[10px] border border-line text-[13px] font-semibold text-ink hover:bg-surface-hover transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-60"
            >
                <RotateCw className={cn('w-3.5 h-3.5', retrying && 'animate-spin')} /> Retry
            </button>
        </div>
    )
}
