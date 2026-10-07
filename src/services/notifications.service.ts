import { supabase } from '@/lib/supabase'
import { currentSubscription } from '@/lib/push'
import { handleError, invalidatesOnWrite, sessionUser, type ServiceResult, SIGNED_OUT_MESSAGE } from './_base'
import type { NotificationSettings } from '@/types'

export type NotificationPrefs = Pick<NotificationSettings, 'bills' | 'debts' | 'budgets' | 'daily_log' | 'daily_hour'>

/** What a user without a settings row gets; mirrors the column defaults. */
export const DEFAULT_PREFS: NotificationPrefs = {
    bills: true,
    debts: true,
    budgets: true,
    daily_log: true,
    daily_hour: 20,
}

/** The tables don't exist yet: the reminders migration hasn't been run. */
function isMissingTable(error: { code?: string } | null) {
    return error?.code === 'PGRST205' || error?.code === '42P01'
}

export const notificationsService = invalidatesOnWrite({
    async getSettings(): Promise<ServiceResult<NotificationPrefs>> {
        try {
            const { data, error } = await supabase
                .from('notification_settings')
                .select('bills, debts, budgets, daily_log, daily_hour')
                .maybeSingle()
            if (isMissingTable(error)) return { data: DEFAULT_PREFS, error: null }
            if (error) throw error
            return { data: data ?? DEFAULT_PREFS, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /** Saves the choices, and the device's time zone so reminders come at local times. */
    async saveSettings(prefs: NotificationPrefs): Promise<ServiceResult<null>> {
        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)
            const { error } = await supabase.from('notification_settings').upsert({
                ...prefs,
                user_id: user.id,
                time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
                updated_at: new Date().toISOString(),
            })
            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /** Registers this device to receive reminders. */
    async enableDevice(subscription: PushSubscription, prefs: NotificationPrefs): Promise<ServiceResult<null>> {
        try {
            const json = subscription.toJSON()
            if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
                throw new Error('This browser gave an incomplete notification address. Try again.')
            }
            const { error } = await supabase.rpc('save_push_subscription', {
                p_endpoint: json.endpoint,
                p_p256dh: json.keys.p256dh,
                p_auth: json.keys.auth,
                p_user_agent: navigator.userAgent.slice(0, 300),
            })
            if (error) throw error
            // Also stores the time zone, which the reminders need even if nothing was changed.
            return await this.saveSettings(prefs)
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /** Stops reminders on this device. Others keep theirs. */
    async disableDevice(): Promise<ServiceResult<null>> {
        try {
            const subscription = await currentSubscription()
            if (!subscription) return { data: null, error: null }
            const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
            await subscription.unsubscribe()
            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async sendTest(): Promise<ServiceResult<null>> {
        try {
            const { error } = await supabase.functions.invoke('send-reminders', { body: { test: true } })
            if (error) throw new Error('The test couldn’t be sent. Reminders may not be set up on the server yet.')
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
})
