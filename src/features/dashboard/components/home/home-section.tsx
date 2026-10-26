import type { ReactNode } from 'react'

/** A quiet Home section: a heading, something small on its right, and its rows. */
export function HomeSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
    return (
        <section aria-label={title}>
            <div className="flex items-baseline justify-between gap-3 pb-1.5">
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
                {aside}
            </div>
            {children}
        </section>
    )
}
