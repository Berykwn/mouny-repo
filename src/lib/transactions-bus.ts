const target = new EventTarget()
const EVENT = 'transactions-changed'

export function emitTransactionsChanged() {
    target.dispatchEvent(new Event(EVENT))
}

export function onTransactionsChanged(callback: () => void) {
    target.addEventListener(EVENT, callback)
    return () => target.removeEventListener(EVENT, callback)
}

const PERIODS_EVENT = 'periods-changed'

/** A pay period was opened or closed — anything holding the active period should refetch. */
export function emitPeriodsChanged() {
    target.dispatchEvent(new Event(PERIODS_EVENT))
}

export function onPeriodsChanged(callback: () => void) {
    target.addEventListener(PERIODS_EVENT, callback)
    return () => target.removeEventListener(PERIODS_EVENT, callback)
}
