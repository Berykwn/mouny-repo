// Sends reminders as push notifications. Two callers:
//  - the hourly pg_cron job (x-reminders-secret header): everything due_reminders() says
//    is due right now, to every device of each user, recorded so it goes out once;
//  - a signed-in user (their own Authorization header): a test notification to their
//    devices, from the Notifications drawer.
// Deployed with --no-verify-jwt, since the cron job has no user token. See README.md.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
)

webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Reminder {
    user_id: string
    kind: string
    key: string
    name: string | null
    amount: number | null
    budget: number | null
    pct: number | null
}

interface Payload {
    title: string
    body: string
    /** Path inside the app to open on tap. */
    url: string
    /** A newer notification with the same tag replaces the older one. */
    tag: string
}

interface Subscription {
    id: string
    user_id: string
    endpoint: string
    p256dh: string
    auth: string
}

const rupiah = (n: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(n)

const listNames = (names: string[]) => names.length <= 3
    ? names.join(', ')
    : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`

/** Bills due the same day become one notification; debts and budgets stay one each. */
function word(kind: string, items: Reminder[]): Payload[] {
    const when = kind.endsWith('today') ? 'today' : 'tomorrow'
    switch (kind) {
        case 'bill_today':
        case 'bill_tomorrow': {
            const total = items.reduce((s, r) => s + Number(r.amount), 0)
            return [items.length === 1
                ? { title: `${items[0].name} is due ${when}`, body: `${rupiah(total)} · tap to mark it paid.`, url: '/bills', tag: `bills-${when}` }
                : { title: `${items.length} bills due ${when}`, body: `${listNames(items.map(r => r.name!))} · ${rupiah(total)} in all.`, url: '/bills', tag: `bills-${when}` }]
        }
        case 'debt_today':
        case 'debt_tomorrow':
            return items.map(r => ({
                title: `You owe ${r.name} ${rupiah(Number(r.amount))}`,
                body: `It’s due ${when}.`,
                url: '/debts',
                tag: r.key,
            }))
        case 'receivable_today':
        case 'receivable_tomorrow':
            return items.map(r => ({
                title: `${r.name} owes you ${rupiah(Number(r.amount))}`,
                body: `They’re due to pay you back ${when}.`,
                url: '/debts',
                tag: r.key,
            }))
        case 'budget':
            return items.map(r => ({
                title: Number(r.pct) >= 100 ? `${r.name} is over budget` : `${r.name} is at ${r.pct}% of its budget`,
                body: `${rupiah(Number(r.amount))} of ${rupiah(Number(r.budget))} spent this period.`,
                url: '/category',
                tag: r.key,
            }))
        case 'daily':
            return [{ title: 'Anything to log today?', body: 'Nothing recorded yet today — it only takes a tap.', url: '/transactions', tag: 'daily' }]
        default:
            return []
    }
}

/** Sends to every device; a device the push service no longer knows is forgotten. */
async function send(subscriptions: Subscription[], payload: Payload): Promise<number> {
    let delivered = 0
    await Promise.all(subscriptions.map(async sub => {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify(payload),
                { TTL: 6 * 60 * 60 },
            )
            delivered++
        } catch (err) {
            const status = (err as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            } else {
                console.error('push failed', status, (err as Error).message)
            }
        }
    }))
    return delivered
}

async function subscriptionsOf(userIds: string[]): Promise<Subscription[]> {
    const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth')
        .in('user_id', userIds)
    if (error) throw error
    return data ?? []
}

async function runScheduled(): Promise<Response> {
    const { data, error } = await supabase.rpc('due_reminders')
    if (error) throw error
    const reminders = (data ?? []) as Reminder[]
    if (reminders.length === 0) return json({ sent: 0 })

    const subscriptions = await subscriptionsOf([...new Set(reminders.map(r => r.user_id))])
    let sent = 0
    const byUser = Map.groupBy(reminders, r => r.user_id)
    for (const [userId, items] of byUser) {
        const devices = subscriptions.filter(s => s.user_id === userId)
        for (const [kind, group] of Map.groupBy(items, r => r.kind)) {
            for (const payload of word(kind, group)) {
                sent += await send(devices, payload)
            }
        }
        // Recorded even when every device failed: a dead device shouldn't be retried hourly.
        const { error: logError } = await supabase
            .from('notification_log')
            .upsert(items.map(r => ({ user_id: userId, key: r.key })), { ignoreDuplicates: true })
        if (logError) console.error('log failed', logError.message)
    }
    return json({ reminders: reminders.length, sent })
}

async function runTest(req: Request): Promise<Response> {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } }
    if (!user) return json({ error: 'Not signed in' }, 401)

    const devices = await subscriptionsOf([user.id])
    if (devices.length === 0) return json({ error: 'No device has notifications on' }, 404)
    const sent = await send(devices, {
        title: 'Notifications are on',
        body: 'This is how Mouny reminders will look.',
        url: '/menu',
        tag: 'test',
    })
    return json({ sent })
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    try {
        const secret = Deno.env.get('REMINDERS_SECRET')
        if (secret && req.headers.get('x-reminders-secret') === secret) return await runScheduled()
        return await runTest(req)
    } catch (err) {
        console.error(err)
        return json({ error: (err as Error).message }, 500)
    }
})
