/**
 * This device's push subscription: the address the send-reminders Edge Function sends
 * reminders to. The service worker (public/push-sw.js) shows them.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushSupport =
    /** Works here. */
    | 'supported'
    /** iPhone and iPad only allow it once the app is added to the Home Screen. */
    | 'needs-install'
    /** This browser can't, or the build has no VAPID key. */
    | 'unsupported'

export function pushSupport(): PushSupport {
    const capable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (capable && VAPID_PUBLIC_KEY) return 'supported'
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const installed = window.matchMedia('(display-mode: standalone)').matches
    return ios && !installed && VAPID_PUBLIC_KEY ? 'needs-install' : 'unsupported'
}

/** The service worker, or null when none is running (dev, or the first load not done yet). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null
    return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function currentSubscription(): Promise<PushSubscription | null> {
    const reg = await registration()
    return reg ? reg.pushManager.getSubscription() : null
}

/** Asks for permission if needed and subscribes. Throws with a message for the user. */
export async function subscribe(): Promise<PushSubscription> {
    if (!VAPID_PUBLIC_KEY) throw new Error('Notifications aren’t set up for this app yet.')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
        throw new Error(permission === 'denied'
            ? 'Notifications are blocked. Allow them for Mouny in your browser’s site settings.'
            : 'Notifications weren’t allowed.')
    }
    const reg = await registration()
    if (!reg) throw new Error('The app is still getting ready offline. Reload and try again.')
    return (await reg.pushManager.getSubscription()) ?? reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
    })
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
    const base64 = (value + '='.repeat((4 - value.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64)
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    return bytes
}
