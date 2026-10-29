import type { ReactNode } from 'react'

/** A key as printed on the keyboard, e.g. in the palette's hints and the top bar's Search. */
export function Kbd({ children }: { children: ReactNode }) {
    return (
        <kbd className="inline-grid place-items-center min-w-[22px] h-[22px] px-1.5 rounded-[6px] border border-line bg-line-soft font-sans text-[11.5px] font-semibold text-muted-ink">
            {children}
        </kbd>
    )
}
