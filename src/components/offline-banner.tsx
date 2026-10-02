import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'

/**
 * Says the app is offline, so the last saved data on screen isn't mistaken for live
 * numbers and a refused save isn't a surprise.
 */
export function OfflineBanner() {
    const online = useOnlineStatus()
    if (online) return null

    return (
        <div
            role="status"
            className="fixed top-0 inset-x-0 z-50 flex justify-center pt-[calc(env(safe-area-inset-top)+8px)] pointer-events-none"
        >
            <div className="flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-white dark:text-neutral-900 shadow-lg">
                <WifiOff className="w-3.5 h-3.5" strokeWidth={2} />
                Offline · showing your last saved data
            </div>
        </div>
    )
}
