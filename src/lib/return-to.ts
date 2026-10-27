/** Where to go after signing in: the page the user was sent away from, if it was in the app. */
export function returnTo(state: unknown): string {
    const from = (state as { from?: unknown } | null)?.from
    if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return '/'
    if (from.startsWith('/login') || from.startsWith('/forgot-password')) return '/'
    return from
}
