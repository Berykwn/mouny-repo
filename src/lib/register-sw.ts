import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

/** How often an app left open asks the server for a newer version. */
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000

/**
 * Registers the service worker, which keeps the app working offline. An installed app can
 * stay open for days, and the browser only looks for a new version when a page loads, so
 * it also checks every hour and whenever the app comes back to the foreground.
 * A new version waits until the user taps Reload, rather than reloading mid-form.
 */
export function registerServiceWorker() {
    let registration: ServiceWorkerRegistration | undefined

    const updateSW = registerSW({
        onNeedRefresh() {
            toast('A new version of Mouny is ready', {
                duration: Infinity,
                action: {
                    label: 'Reload',
                    // Usually the new worker waits for this and the page reloads once it takes
                    // over. On a first visit no worker controls the page, so the new one is
                    // already active with nothing to take over: a plain reload loads it.
                    onClick: () => registration?.waiting ? void updateSW(true) : window.location.reload(),
                },
            })
        },
        onRegisteredSW(_url, r) {
            if (!r) return
            registration = r
            const check = () => {
                // Offline the check would only fail; an installing worker is already updating.
                if (navigator.onLine === false || r.installing) return
                void r.update().catch(() => {})
            }
            setInterval(check, UPDATE_CHECK_INTERVAL)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') check()
            })
        },
    })

    requestPersistentStorage()
}

/**
 * Asks the browser not to clear the saved data (the offline copy of the cache) when the
 * device runs low on space. Only for the installed app: there the browser grants it
 * silently, while in a browser tab Firefox would pop up a permission prompt.
 */
function requestPersistentStorage() {
    const installed = window.matchMedia('(display-mode: standalone)').matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!installed || !navigator.storage?.persist) return
    void navigator.storage.persisted()
        .then(persisted => persisted || navigator.storage.persist())
        .catch(() => {})
}
