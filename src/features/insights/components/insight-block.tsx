import type { ReactNode } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsightBlockProps {
    kicker: string
    /** One sentence that says what the chart shows. */
    title: ReactNode
    sub?: ReactNode
    /** How the numbers are worked out, folded away until asked for. */
    how?: ReactNode
    className?: string
    children?: ReactNode
}

/**
 * Every Insights block reads the same way: a conclusion, the chart behind it, and how it's
 * calculated. Rows divided by a line on a phone; calm cards side by side on a desktop.
 */
export function InsightBlock({ kicker, title, sub, how, className, children }: InsightBlockProps) {
    return (
        <section
            aria-label={kicker}
            className={cn(
                'py-6 border-b border-line-soft last:border-b-0 min-w-0',
                'lg:rounded-[20px] lg:border lg:border-line lg:bg-surface lg:p-6 lg:last:border-b',
                className
            )}
        >
            <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-muted-ink">{kicker}</p>
            <h3 className="mt-2 text-[19px] font-semibold leading-snug tracking-[-0.015em] text-ink">{title}</h3>
            {sub && <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-ink">{sub}</p>}
            {children && <div className="mt-4">{children}</div>}
            {how && (
                <details className="group mt-4">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-semibold text-muted-ink hover:text-ink [&::-webkit-details-marker]:hidden">
                        <Info aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                        How it’s calculated
                        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-2 text-[12.5px] leading-relaxed text-muted-ink">{how}</div>
                </details>
            )}
        </section>
    )
}

/** The emphasised part of a title, in the accent colour. */
export function Em({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'negative' | 'warning' }) {
    return (
        <span className={tone === 'brand' ? 'text-brand-ink' : tone === 'negative' ? 'text-negative' : 'text-warning'}>
            {children}
        </span>
    )
}

/** A block's quiet empty or waiting state. */
export function BlockNote({ children }: { children: ReactNode }) {
    return <p className="py-4 text-[13px] text-muted-ink">{children}</p>
}
