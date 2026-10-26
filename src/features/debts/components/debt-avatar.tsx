import { cn } from '@/lib/utils'

function initials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return '?'
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

interface DebtAvatarProps {
    name: string
    /** Which side it's on; kept for callers, the avatar itself stays neutral. */
    type?: string
    /** Past its due date: the one case the avatar turns red. */
    late?: boolean
    /** Settled records fade so the open ones stand out. */
    settled?: boolean
    className?: string
}

/** The counterparty's initials on a quiet disc, red only when they're late. */
export function DebtAvatar({ name, late, settled, className }: DebtAvatarProps) {
    return (
        <div
            className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[13px] font-semibold tracking-[.02em]',
                settled ? 'bg-surface-hover text-subtle-ink'
                    : late ? 'bg-negative-soft text-negative-ink'
                        : 'bg-surface-hover text-muted-ink',
                className
            )}
        >
            {initials(name)}
        </div>
    )
}
