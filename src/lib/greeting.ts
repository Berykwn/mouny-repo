type NamedUser = { user_metadata?: { full_name?: string } | null } | null

/** The name the user set in Settings, trimmed; null when they haven't set one. */
export function displayName(user: NamedUser): string | null {
    const name = user?.user_metadata?.full_name?.trim().replace(/\s+/g, ' ')
    return name || null
}

/** "Budi" from "Budi Santoso", for a friendly hello. */
export function firstName(user: NamedUser): string | null {
    return displayName(user)?.split(' ')[0] ?? null
}

/** A hello that follows the clock: morning until 11, afternoon until 15, evening until 22. */
export function greeting(now: Date = new Date()): string {
    const h = now.getHours()
    if (h >= 4 && h < 11) return 'Good morning'
    if (h >= 11 && h < 15) return 'Good afternoon'
    if (h >= 15 && h < 22) return 'Good evening'
    return 'Up late'
}
