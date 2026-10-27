import { cn } from '@/lib/utils'

/**
 * The Mouny creature from the logo, for the few friendly moments (a hello, an empty list).
 * It's the favicon as-is, so the mark itself never changes.
 */
export function Mascot({ className }: { className?: string }) {
    return (
        <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            aria-hidden="true"
            className={cn('w-8 h-8 shrink-0 select-none', className)}
            draggable={false}
        />
    )
}
