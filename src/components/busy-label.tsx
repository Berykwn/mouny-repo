import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusyLabelProps {
    busy?: boolean
    children: ReactNode
    /** For the spinner, e.g. mx-auto in a full-width button. */
    className?: string
}

/**
 * A button's label that turns into a spinner while it works. The label stays for screen
 * readers, so the button keeps its name instead of going silent mid-save.
 */
export function BusyLabel({ busy, children, className }: BusyLabelProps) {
    if (!busy) return <>{children}</>
    return (
        <>
            <Loader2 aria-hidden="true" className={cn('w-4 h-4 animate-spin', className)} />
            <span className="sr-only">{children}</span>
        </>
    )
}
