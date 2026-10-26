import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
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
    { key: 'bills', label: 'Bills coming due', sub: 'The evening before and the morning they’re due' },
    { key: 'debts', label: 'Debts & receivables', sub: 'On the due date' },
    { key: 'budgets', label: 'Budgets', sub: 'When a category passes 80% and 100%' },
    { key: 'daily_log', label: 'Daily check-in', sub: 'In the evening, if nothing was recorded' },
]

const EVENING_HOURS = [19, 20, 21, 22]

const ROW = 'flex items-center gap-3 py-3 border-b border-line-soft last:border-0'

/**
 * Settings' Reminders: this device on or off, then what to be reminded about and when. The
 * topics are saved for the account; each device that's turned on gets the same ones.
 */
export function RemindersSection() {
    const queryClient = useQueryClient()
    const { data: saved } = useNotificationSettings()
    const prefs = saved ?? DEFAULT_PREFS
    const support = pushSupport()
    const [enabled, setEnabled] = useDeviceEnabled()
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

    async function setDevice(on: boolean) {
        setBusy('device')
        try {
            if (on) {
                const subscription = await subscribe()
                const { error } = await notificationsService.enableDevice(subscription, prefs)
                if (error) throw new Error(error)
            } else {
                const { error } = await notificationsService.disableDevice()
                if (error) throw new Error(error)
            }
            setEnabled(on)
            toast.success(on ? 'Reminders are on for this device.' : 'Reminders are off for this device.')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Reminders couldn’t be changed.')
        } finally {
            setBusy(null)
        }
    }

    async function sendTest() {
        setBusy('test')
        const { error } = await notificationsService.sendTest()
        setBusy(null)
        if (error) toast.error(error)
        else toast.success('Test sent. It should arrive in a few seconds.')
    }

    const deviceSub = support === 'unsupported'
        ? 'This browser can’t show notifications. Try Chrome, or install Mouny.'
        : support === 'needs-install'
            ? 'On iPhone and iPad: Share, then “Add to Home Screen”, and open Mouny from there.'
            : enabled ? 'Reminders arrive here' : 'Turn on to get reminders here'

    return (
        <section>
            <div className="flex items-baseline justify-between">
                <h2 className="text-[17px] font-semibold text-ink">Reminders</h2>
                <span className="text-[13px] text-subtle-ink">This device</span>
            </div>

            <div className="mt-1">
                <label className={ROW}>
                    <span className="flex-1 min-w-0">
                        <span className="block text-[15px] text-ink">On this device</span>
                        <span className="block text-[13px] text-subtle-ink">{deviceSub}</span>
                    </span>
                    {busy === 'device' && <Loader2 className="w-4 h-4 animate-spin text-muted-ink" />}
                    <Switch
                        checked={!!enabled}
                        disabled={support !== 'supported' || enabled === null || busy !== null}
                        onCheckedChange={on => void setDevice(on)}
                        className="data-[state=checked]:bg-brand"
                    />
                </label>

                {TOPICS.map(topic => (
                    <label key={topic.key} className={cn(ROW, 'cursor-pointer')}>
                        <span className="flex-1 min-w-0">
                            <span className={cn('block text-[15px]', enabled ? 'text-ink' : 'text-muted-ink')}>{topic.label}</span>
                            <span className="block text-[13px] text-subtle-ink">{topic.sub}</span>
                        </span>
                        <Switch
                            checked={prefs[topic.key]}
                            onCheckedChange={checked => void update({ [topic.key]: checked })}
                            className="data-[state=checked]:bg-brand"
                        />
                    </label>
                ))}

                <div className={cn(ROW, 'flex-wrap')}>
                    <span className="flex-1 min-w-[200px]">
                        <span className="block text-[15px] text-ink">Evening reminder</span>
                        <span className="block text-[13px] text-subtle-ink">Tomorrow’s dues and the check-in; today’s come at 08:00</span>
                    </span>
                    <div role="radiogroup" aria-label="Evening reminder time" className="flex shrink-0 rounded-[10px] bg-line-soft p-[3px]">
                        {EVENING_HOURS.map(hour => (
                            <button
                                key={hour}
                                type="button"
                                role="radio"
                                aria-checked={prefs.daily_hour === hour}
                                onClick={() => void update({ daily_hour: hour })}
                                className={cn(
                                    'h-8 px-2.5 rounded-[8px] text-[13px] font-semibold tabular-nums transition-colors',
                                    prefs.daily_hour === hour ? 'bg-surface text-ink shadow-sm' : 'text-muted-ink hover:text-ink'
                                )}
                            >
                                {String(hour).padStart(2, '0')}:00
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {enabled && (
                <button
                    type="button"
                    onClick={sendTest}
                    disabled={busy !== null}
                    className="mt-2 text-[13.5px] font-semibold text-brand-ink hover:text-brand transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                    {busy === 'test' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Send a test
                </button>
            )}
        </section>
    )
}
