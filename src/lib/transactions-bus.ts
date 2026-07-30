const target = new EventTarget()
const EVENT = 'transactions-changed'

export function emitTransactionsChanged() {
    target.dispatchEvent(new Event(EVENT))
}

export function onTransactionsChanged(callback: () => void) {
    target.addEventListener(EVENT, callback)
    return () => target.removeEventListener(EVENT, callback)
}
