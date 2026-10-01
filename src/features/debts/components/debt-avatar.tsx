import { cn } from '@/lib/utils'

function initials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return '?'
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

interface DebtAvatarProps {
    name: string
    type: string
    /** Settled records fade to grey so the open ones stand out. */
    settled?: boolean
    className?: string
}

/** The counterparty's initials — red when you owe them, green when they owe you. */
export function DebtAvatar({ name, type, settled, className }: DebtAvatarProps) {
    return (
        <div
            className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[12px] font-semibold tracking-[.02em]',
                settled
                    ? 'bg-surface-hover text-muted-ink'
                    : type === 'debt' ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive',
                className
            )}
        >
            {initials(name)}
        </div>
    )
}
