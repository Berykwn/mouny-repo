import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SmartLineAction {
    label: string
    /** A button action; give `to` instead for a link. */
    onClick?: () => void
    to?: string
    disabled?: boolean
}

/** Lucide icons and Phosphor (`~icons/ph/*`) both fit. */
type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string; strokeWidth?: number | string }>

interface SmartLineProps {
    children: ReactNode
    icon?: IconComponent
    /** The first is the suggestion (cobalt); any after it are the quiet way out ("Not now"). */
    actions?: SmartLineAction[]
    className?: string
}

const ACTION = 'text-[13px] py-0.5 transition-colors disabled:opacity-50 disabled:pointer-events-none'

/**
 * The one smart line a screen may carry: a plain sentence on a soft panel, and the explicit
 * actions it suggests. It never acts on its own; the user taps. Every page uses this one,
 * so it looks the same everywhere.
 */
export function SmartLine({ children, icon: Icon = Lightbulb, actions = [], className }: SmartLineProps) {
    return (
        <div className={cn('flex items-start gap-3 rounded-[18px] bg-line-soft p-3.5', className)}>
            <span className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0 text-brand">
                <Icon className="w-4 h-4" strokeWidth={1.9} />
            </span>
            <div className="flex-1 min-w-0 pt-1">
                <p className="text-[13.5px] leading-snug text-muted-ink [&_b]:font-semibold [&_b]:text-ink">{children}</p>
                {actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {actions.map((action, i) => {
                            const tone = i === 0 ? 'font-semibold text-brand-ink hover:text-brand' : 'font-medium text-muted-ink hover:text-ink'
                            return action.to ? (
                                <Link key={action.label} to={action.to} className={cn(ACTION, tone)}>
                                    {action.label}
                                </Link>
                            ) : (
                                <button
                                    key={action.label}
                                    type="button"
                                    onClick={action.onClick}
                                    disabled={action.disabled}
                                    className={cn(ACTION, tone)}
                                >
                                    {action.label}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
