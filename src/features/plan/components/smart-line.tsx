import type { ComponentType, ReactNode, SVGProps } from 'react'
import { cn } from '@/lib/utils'

export interface SmartAction {
    label: string
    onClick: () => void
    disabled?: boolean
}

interface SmartLineProps {
    icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>
    children: ReactNode
    /** The first is the one to take; any after it sit quieter. */
    actions?: SmartAction[]
    className?: string
}

/**
 * The one thing worth knowing on a screen, said in a sentence, with what to do about it.
 * Pages show at most one, and only when its numbers come from data, never a guess.
 */
export function SmartLine({ icon: Icon, children, actions = [], className }: SmartLineProps) {
    return (
        <div className={cn('flex gap-3 rounded-[20px] bg-surface-hover px-4 py-3.5', className)}>
            <span className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0 text-brand">
                <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
                <p className="text-[13px] leading-relaxed text-muted-ink [&_b]:font-semibold [&_b]:text-ink">{children}</p>
                {actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                        {actions.map((a, i) => (
                            <button
                                key={a.label}
                                type="button"
                                onClick={a.onClick}
                                disabled={a.disabled}
                                className={cn(
                                    'text-[13px] font-semibold py-0.5 transition-colors disabled:opacity-50',
                                    i === 0 ? 'text-brand-ink hover:text-brand' : 'text-muted-ink hover:text-ink'
                                )}
                            >
                                {a.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
