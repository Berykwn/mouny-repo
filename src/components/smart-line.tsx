import type { ReactNode } from 'react'
import { Lightbulb, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SmartLineAction {
    label: string
    onClick: () => void
    disabled?: boolean
}

interface SmartLineProps {
    children: ReactNode
    icon?: LucideIcon
    /** The first is the suggestion (cobalt); any after it are the quiet way out ("Not now"). */
    actions?: SmartLineAction[]
    className?: string
}

/**
 * The one smart line a screen may carry: a plain sentence on a soft panel, and the explicit
 * actions it suggests. It never acts on its own; the user taps.
 */
export function SmartLine({ children, icon: Icon = Lightbulb, actions = [], className }: SmartLineProps) {
    return (
        <div className={cn('flex items-start gap-3 rounded-[16px] bg-line-soft p-3.5', className)}>
            <span className="w-[30px] h-[30px] rounded-full bg-surface flex items-center justify-center shrink-0 text-brand">
                <Icon className="w-4 h-4" strokeWidth={1.9} />
            </span>
            <div className="flex-1 min-w-0 pt-[5px]">
                <p className="text-[13.5px] leading-snug text-muted-ink [&_b]:font-semibold [&_b]:text-ink">{children}</p>
                {actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {actions.map((action, i) => (
                            <button
                                key={action.label}
                                type="button"
                                onClick={action.onClick}
                                disabled={action.disabled}
                                className={cn(
                                    'text-[13px] transition-colors disabled:opacity-50 disabled:pointer-events-none',
                                    i === 0 ? 'font-semibold text-brand-ink hover:text-brand' : 'font-medium text-subtle-ink hover:text-ink'
                                )}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
