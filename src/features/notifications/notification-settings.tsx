import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { BottomDrawer } from '@/components/bottom-drawer'
import { Switch } from '@/components/ui/switch'
import { queryKeys, useNotificationSettings } from '@/queries'
import { DEFAULT_PREFS, notificationsService, type NotificationPrefs } from '@/services/notifications.service'
import { currentSubscription, pushSupport, subscribe } from '@/lib/push'
import { cn } from '@/lib/utils'

/** Whether this device gets reminders; null while it's being checked. */
function useDeviceEnabled() {
    const [enabled, setEnabled] = useState<boolean | null>(null)
    useEffect(() => {
        if (pushSupport() !== 'supported') { setEnabled(false); return }
        let cancelled = false
        void currentSubscription()
            .then(sub => { if (!cancelled) setEnabled(!!sub && Notification.permission === 'granted') })
            .catch(() => { if (!cancelled) setEnabled(false) })
        return () => { cancelled = true }
    }, [])
    return [enabled, setEnabled] as const
}

const TOPICS: { key: 'bills' | 'debts' | 'budgets' | 'daily_log'; label: string; sub: string }[] = [
    { key: 'bills', label: 'Bills', sub: 'The evening before and the morning they’re due' },
    { key: 'debts', label: 'Debts', sub: 'Money you owe or are owed, when it’s due' },
    { key: 'budgets', label: 'Budgets', sub: 'When a category passes 80% and 100%' },
    { key: 'daily_log', label: 'Daily check-in', sub: 'If nothing’s logged for the day by the evening' },
]

const EVENING_HOURS = [19, 20, 21, 22]

/** The Menu row: what's on, and the drawer to change it. */
export function NotificationsRow() {
    const [open, setOpen] = useState(false)
    const [enabled, setEnabled] = useDeviceEnabled()
    const support = pushSupport()

    const sub = support === 'unsupported'
        ? 'Not available in this browser'
        : support === 'needs-install'
            ? 'Add Mouny to your Home Screen first'
            : enabled === null
                ? 'Reminders for bills, debts and budgets'
                : enabled ? 'On for this device' : 'Off on this device'

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-soft transition-colors"
            >
                <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 bg-info/10 text-info">
                    {enabled === false && support === 'supported'
                        ? <BellOff className="w-4 h-4" strokeWidth={1.9} />
                        : <Bell className="w-4 h-4" strokeWidth={1.9} />}
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium text-ink">Notifications</span>
                    <span className="block text-[11.5px] text-muted-ink truncate">{sub}</span>
                </span>
                {enabled && (
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-positive/10 text-positive">On</span>
                )}
            </button>

            <BottomDrawer open={open} onClose={() => setOpen(false)} title="Notifications">
                <NotificationSettingsForm enabled={enabled} onEnabledChange={setEnabled} />
            </BottomDrawer>
        </>
    )
}

interface FormProps {
    enabled: boolean | null
    onEnabledChange: (enabled: boolean) => void
}

function NotificationSettingsForm({ enabled, onEnabledChange }: FormProps) {
    const queryClient = useQueryClient()
    const { data: saved } = useNotificationSettings()
    const prefs = saved ?? DEFAULT_PREFS
    const support = pushSupport()
    const [busy, setBusy] = useState<'device' | 'test' | null>(null)

    async function update(change: Partial<NotificationPrefs>) {
        const next = { ...prefs, ...change }
        // Shown straight away; put back if saving fails.
        queryClient.setQueryData(queryKeys.notificationSettings, next)
        const { error } = await notificationsService.saveSettings(next)
        if (error) {
            queryClient.setQueryData(queryKeys.notificationSettings, prefs)
            toast.error(error)
        }
    }

    async function turnOn() {
        setBusy('device')
        try {
            const subscription = await subscribe()
            const { error } = await notificationsService.enableDevice(subscription, prefs)
            if (error) throw new Error(error)
            onEnabledChange(true)
            toast.success('Notifications are on for this device.')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Notifications couldn’t be turned on.')
        } finally {
            setBusy(null)
        }
    }

    async function turnOff() {
        setBusy('device')
        const { error } = await notificationsService.disableDevice()
        setBusy(null)
        if (error) { toast.error(error); return }
        onEnabledChange(false)
        toast.success('Notifications are off for this device.')
    }

    async function sendTest() {
        setBusy('test')
        const { error } = await notificationsService.sendTest()
        setBusy(null)
        if (error) toast.error(error)
        else toast.success('Test sent. It should arrive in a few seconds.')
    }

    return (
        <div className="space-y-4 pb-2">
            <div className="rounded-[14px] bg-surface-soft p-4">
                {support === 'unsupported' ? (
                    <p className="text-[12.5px] text-muted-ink leading-relaxed">
                        This browser can’t show notifications from Mouny. Try Chrome, or install Mouny from your browser’s menu.
                    </p>
                ) : support === 'needs-install' ? (
                    <p className="text-[12.5px] text-muted-ink leading-relaxed">
                        On iPhone and iPad, notifications work once Mouny is on your Home Screen: tap Share, then “Add to Home Screen”, and open it from there.
                    </p>
                ) : enabled ? (
                    <>
                        <p className="text-[13px] font-medium text-ink">On for this device</p>
                        <p className="mt-0.5 text-[12px] text-muted-ink leading-relaxed">Each device you turn it on for gets the same reminders.</p>
                        <div className="mt-3 flex gap-2">
                            <button
                                type="button"
                                onClick={sendTest}
                                disabled={busy !== null}
                                className="flex-1 h-10 rounded-[12px] text-[12.5px] font-semibold border border-line text-ink hover:bg-surface-hover transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                            >
                                {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send a test
                            </button>
                            <button
                                type="button"
                                onClick={turnOff}
                                disabled={busy !== null}
                                className="flex-1 h-10 rounded-[12px] text-[12.5px] font-semibold text-muted-ink hover:text-ink hover:bg-surface-hover transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                            >
                                {busy === 'device' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />} Turn off
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-[13px] font-medium text-ink">Get reminded before it’s too late</p>
                        <p className="mt-0.5 text-[12px] text-muted-ink leading-relaxed">
                            Bills and debts coming due, budgets running out, and a nudge when the day isn’t logged.
                        </p>
                        <button
                            type="button"
                            onClick={turnOn}
                            disabled={busy !== null || enabled === null}
                            className="mt-3 w-full h-11 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {busy === 'device' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Turn on for this device
                        </button>
                    </>
                )}
            </div>

            <div>
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-1 mb-1.5">Remind me about</p>
                <div className="rounded-[14px] border border-line divide-y divide-line-soft">
                    {TOPICS.map(topic => (
                        <label key={topic.key} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                            <span className="flex-1 min-w-0">
                                <span className="block text-[13px] font-medium text-ink">{topic.label}</span>
                                <span className="block text-[11.5px] text-muted-ink">{topic.sub}</span>
                            </span>
                            <Switch
                                checked={prefs[topic.key]}
                                onCheckedChange={checked => void update({ [topic.key]: checked })}
                                className="data-[state=checked]:bg-brand"
                            />
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-1 mb-1.5">Evening reminder</p>
                <div role="radiogroup" aria-label="Evening reminder time" className="flex rounded-[12px] bg-line-soft p-0.5">
                    {EVENING_HOURS.map(hour => (
                        <button
                            key={hour}
                            type="button"
                            role="radio"
                            aria-checked={prefs.daily_hour === hour}
                            onClick={() => void update({ daily_hour: hour })}
                            className={cn(
                                'flex-1 h-9 rounded-[10px] text-[12.5px] font-medium tabular-nums transition-colors',
                                prefs.daily_hour === hour ? 'bg-raised text-ink shadow-sm' : 'text-muted-ink hover:text-ink'
                            )}
                        >
                            {String(hour).padStart(2, '0')}:00
                        </button>
                    ))}
                </div>
                <p className="mt-1.5 px-1 text-[11.5px] text-muted-ink leading-relaxed">
                    What’s due tomorrow and the daily check-in come then; what’s due today comes at 08:00.
                </p>
            </div>
        </div>
    )
}
