import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    children?: ReactNode
    /** The one thing to do about it, e.g. an "Open a period" button. */
    action?: ReactNode
    className?: string
}

/** Nothing here yet: one message and at most one button, never a believable Rp 0. */
export function EmptyState({ icon: Icon, title, children, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center text-center px-4 py-12', className)}>
            <span className="w-12 h-12 rounded-[14px] bg-line-soft flex items-center justify-center text-muted-ink">
                <Icon className="w-6 h-6" strokeWidth={1.7} />
            </span>
            <h2 className="mt-3.5 text-[18px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            {children && <p className="mt-1.5 max-w-[300px] text-[13.5px] leading-relaxed text-muted-ink">{children}</p>}
            {action && <div className="mt-5 w-full max-w-[300px]">{action}</div>}
        </div>
    )
}

/** The primary button an empty state offers. */
export const EMPTY_STATE_BUTTON = 'w-full h-12 rounded-[14px] text-[14px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none'
