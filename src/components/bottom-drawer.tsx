import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomDrawerProps {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}

export function BottomDrawer({ open, onClose, title, children }: BottomDrawerProps) {
    // Lock body scroll when open
    React.useEffect(() => {
        if (open) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={cn(
                'fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-xl',
                'flex flex-col max-h-[90dvh]',
                // Desktop: center as modal
                'lg:inset-auto lg:left-1/2 lg:-translate-x-1/2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2',
                'lg:w-full lg:max-w-md lg:rounded-2xl lg:max-h-[85vh]',
            )}>
                {/* Handle bar — mobile only */}
                <div className="flex justify-center pt-3 pb-1 lg:hidden">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
                    <h2 className="font-semibold text-base">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content — scrollable */}
                <div className="overflow-y-auto flex-1 px-5 py-4">
                    {children}
                </div>
            </div>
        </>
    )
}