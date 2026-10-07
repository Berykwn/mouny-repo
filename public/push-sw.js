// Pulled into the generated service worker (workbox.importScripts in vite.config.ts).
// Shows the reminders sent by the send-reminders Edge Function, and opens the app on the
// right page when one is tapped.

self.addEventListener('push', event => {
    let data = {}
    try {
        data = event.data ? event.data.json() : {}
    } catch {
        data = { body: event.data ? event.data.text() : '' }
    }
    event.waitUntil(self.registration.showNotification(data.title || 'Mouny', {
        body: data.body || '',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: data.tag,
        data: { url: data.url || '/' },
    }))
})

self.addEventListener('notificationclick', event => {
    event.notification.close()
    // Paths are relative to where the app lives, which isn't always the domain's root.
    const target = new URL(String(event.notification.data?.url || '/').replace(/^\//, ''), self.registration.scope).href
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        const open = windows.find(w => w.url.startsWith(self.registration.scope))
        if (open) {
            await open.focus()
            return open.navigate(target).catch(() => {})
        }
        return self.clients.openWindow(target)
    })())
})
