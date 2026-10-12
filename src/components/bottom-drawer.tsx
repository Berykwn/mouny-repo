import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomDrawerProps {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    /** Overrides the drawer's mobile max-height. Defaults to today's `max-h-[90dvh]`. */
    maxHeightClassName?: string
    /** Overrides the title's text styling. Defaults to today's `font-semibold text-[15px] text-ink`. */
    titleClassName?: string
    /**
     * Set while closing would throw away what's been entered: a stray tap outside, the X or
     * Escape then asks first, with this as the question (e.g. "Discard this transaction?").
     */
    confirmDiscard?: string | null
}

/**
 * Open drawers across the app, newest last. Drawers nest (an account picker inside a form
 * drawer): the body scroll lock holds while any is open, and Escape closes only the top one.
 */
const openDrawers: symbol[] = []

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function BottomDrawer({
    open,
    onClose,
    title,
    children,
    maxHeightClassName = 'max-h-[90dvh]',
    titleClassName = 'font-semibold text-[15px] text-ink',
    confirmDiscard = null,
}: BottomDrawerProps) {
    const panelRef = React.useRef<HTMLDivElement>(null)
    const keepRef = React.useRef<HTMLButtonElement>(null)
    const titleId = React.useId()
    const [confirming, setConfirming] = React.useState(false)
    // Asked only while there's something to lose; once there isn't, the question goes too.
    const asking = confirming && !!confirmDiscard
    const requestClose = () => {
        // The question is on screen: it's answered with its own buttons.
        if (asking) return
        if (confirmDiscard) setConfirming(true)
        else onClose()
    }
    // Escape reads the latest handlers without re-running the open effect for them.
    const escapeRef = React.useRef(() => {})
    React.useEffect(() => {
        // A second Escape while asking means "keep editing", the safe answer.
        escapeRef.current = asking ? () => setConfirming(false) : requestClose
    })
    React.useEffect(() => { if (asking) keepRef.current?.focus() }, [asking])
    React.useEffect(() => { if (!open) setConfirming(false) }, [open])

    // What had focus when the drawer opened, noted while rendering: by the time effects run,
    // a field inside with autoFocus has already taken it.
    const openerRef = React.useRef<HTMLElement | null>(null)
    const wasOpen = React.useRef(false)
    if (open && !wasOpen.current && typeof document !== 'undefined') {
        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    }
    wasOpen.current = open

    React.useEffect(() => {
        if (!open) return
        const self = Symbol('drawer')
        openDrawers.push(self)
        document.body.style.overflow = 'hidden'

        // Focus moves into the drawer and comes back to what opened it. The panel itself
        // takes focus, not its first field, so a phone doesn't pop its keyboard uninvited.
        // A field that took focus itself (autoFocus) keeps it.
        const opener = openerRef.current
        if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus({ preventScroll: true })

        const onKeyDown = (event: KeyboardEvent) => {
            if (openDrawers[openDrawers.length - 1] !== self) return
            if (event.key === 'Escape') {
                // A popover inside (the date picker's calendar) already took this Escape.
                if (event.defaultPrevented) return
                event.preventDefault()
                escapeRef.current()
                return
            }
            // Keep Tab inside the drawer while it's open.
            if (event.key !== 'Tab' || !panelRef.current) return
            const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null)
            if (focusable.length === 0) { event.preventDefault(); return }
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            const active = document.activeElement
            if (event.shiftKey && (active === first || active === panelRef.current)) { event.preventDefault(); last.focus() }
            else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
        }
        document.addEventListener('keydown', onKeyDown)

        return () => {
            document.removeEventListener('keydown', onKeyDown)
            openDrawers.splice(openDrawers.indexOf(self), 1)
            // Only the last one to close may unlock the page, or it scrolls behind the one still open.
            if (openDrawers.length === 0) document.body.style.overflow = ''
            if (opener?.isConnected) opener.focus({ preventScroll: true })
        }
    }, [open])

    if (!open) return null

    // On the body, so a drawer opened from inside another isn't positioned (or clipped)
    // by the outer one's centring transform on desktop, and stacks above it.
    return createPortal(
        <>
            <div
                aria-hidden="true"
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={requestClose}
            />

            {/* Drawer */}
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={cn(
                    'fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-[20px] border-t border-line shadow-xl outline-none',
                    'flex flex-col pb-[env(safe-area-inset-bottom)] lg:pb-0',
                    maxHeightClassName,
                    // Desktop: center as modal
                    'lg:inset-auto lg:left-1/2 lg:-translate-x-1/2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2',
                    'lg:w-full lg:max-w-md lg:rounded-[20px] lg:border lg:max-h-[85vh]',
                )}
            >
                {/* Handle bar — mobile only */}
                <div aria-hidden="true" className="flex justify-center pt-3 pb-1 lg:hidden">
                    <div className="w-10 h-1 rounded-full bg-line" />
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-b border-line-soft shrink-0">
                    <h2 id={titleId} className={titleClassName}>{title}</h2>
                    <button
                        type="button"
                        onClick={requestClose}
                        aria-label="Close"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-ink hover:text-ink hover:bg-surface-hover transition-colors"
                    >
                        <X aria-hidden="true" className="w-4 h-4" />
                    </button>
                </div>

                {asking && (
                    <div role="alertdialog" aria-label={confirmDiscard!} className="flex items-center gap-3 px-5 py-3 bg-warning-soft border-b border-line-soft shrink-0">
                        <p className="flex-1 text-[12.5px] font-medium text-warning-ink">{confirmDiscard}</p>
                        <button
                            ref={keepRef}
                            type="button"
                            onClick={() => setConfirming(false)}
                            className="h-8 px-3 rounded-[10px] text-[12.5px] font-medium text-ink bg-surface border border-line hover:bg-surface-soft transition-colors"
                        >
                            Keep editing
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-8 px-3 rounded-[10px] text-[12.5px] font-semibold text-white bg-negative hover:bg-negative/90 transition-colors"
                        >
                            Discard
                        </button>
                    </div>
                )}

                <div className="overflow-y-auto flex-1 px-5 py-4">
                    {children}
                </div>
            </div>
        </>,
        document.body,
    )
}
