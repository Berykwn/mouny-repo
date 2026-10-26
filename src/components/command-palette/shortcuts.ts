export type ShortcutAction = 'palette' | 'new-transaction' | 'go-ledger' | 'go-insights'

/** How long after G the second key still counts. */
export const CHORD_TIMEOUT_MS = 1200

interface KeyLike {
    key: string
    metaKey: boolean
    ctrlKey: boolean
    altKey: boolean
}

/** Whether keys go into a field right now, so single-letter shortcuts must stay out of the way. */
export function isTypingTarget(target: EventTarget | null): boolean {
    if (!target || typeof (target as HTMLElement).tagName !== 'string') return false
    const el = target as HTMLElement
    const tag = el.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

export interface ShortcutResult {
    action: ShortcutAction | null
    /** G was pressed: the next key picks where to go. */
    pendingG: boolean
}

/**
 * The app's keyboard shortcuts: ⌘K / Ctrl+K opens the palette from anywhere; outside a field,
 * / opens it too, N starts a transaction, and G then L or I goes to Ledger or Insights.
 */
export function resolveShortcut(event: KeyLike, typing: boolean, pendingG: boolean): ShortcutResult {
    const key = event.key.toLowerCase()
    if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'k') return { action: 'palette', pendingG: false }
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return { action: null, pendingG: false }

    if (pendingG) {
        if (key === 'l') return { action: 'go-ledger', pendingG: false }
        if (key === 'i') return { action: 'go-insights', pendingG: false }
        return { action: null, pendingG: false }
    }
    if (key === 'g') return { action: null, pendingG: true }
    if (key === 'n') return { action: 'new-transaction', pendingG: false }
    if (key === '/') return { action: 'palette', pendingG: false }
    return { action: null, pendingG: false }
}
