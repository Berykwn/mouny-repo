import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The soft brand glow in a page hero's top-right corner — the one decorative touch the
 * summary cards share. The card needs `relative overflow-hidden`, and its content `relative`.
 */
export function HeroGlow() {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-60"
            style={{ background: 'radial-gradient(circle, var(--brand-soft) 0%, transparent 70%)' }}
        />
    )
}

interface HeroActionProps {
    onClick: () => void
    disabled?: boolean
    /** Replaces the default plus icon (e.g. a spinner while working). */
    icon?: ReactNode
    children: ReactNode
}

/**
 * A hero's "add" action, sitting in the label row of the card. Glass — translucent white
 * over the glow — and never green: the top bar already carries the one green primary button.
 */
export function HeroAction({ onClick, disabled, icon, children }: HeroActionProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'h-8 flex items-center gap-1 rounded-full pl-2.5 pr-3',
                'text-[12px] font-medium transition-colors',
                'bg-white/60 backdrop-blur-md border border-line text-ink hover:bg-white/90',
                'disabled:opacity-40 disabled:pointer-events-none'
            )}
        >
            {icon ?? <Plus className="w-3.5 h-3.5" />}
            {children}
        </button>
    )
}
