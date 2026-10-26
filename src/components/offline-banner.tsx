import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'

/** Why a write is refused while offline, for toasts and disabled buttons' titles. */
export const OFFLINE_REASON = 'You’re offline. New entries need a connection.'

/**
 * Says the app is offline, so the last saved data on screen isn't mistaken for live
 * numbers and a refused save isn't a surprise. The data stays; only writes wait.
 */
export function OfflineBanner() {
    const online = useOnlineStatus()
    if (online) return null

    return (
        <div
            role="status"
            className="fixed top-0 inset-x-0 z-[60] flex justify-center pt-[calc(env(safe-area-inset-top)+8px)] pointer-events-none"
        >
            <div className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[12.5px] font-semibold text-on-ink shadow-lg">
                <WifiOff className="w-3.5 h-3.5" strokeWidth={2} />
                Offline · showing your last data
            </div>
        </div>
    )
}
