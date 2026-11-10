import type { Category } from '@/types'

/** How many transactions each category had recently, by category id. */
export type CategoryUse = Record<string, number>

/** How far back "recently" reaches for the category order. */
export const CATEGORY_USE_DAYS = 90

/**
 * Most used first, so the rail opens on what the user actually picks rather than on
 * whatever starts with A (Transportation, used a dozen times, sat 18th of 19). Ties,
 * and categories never used, stay A–Z. Without counts yet, plain A–Z.
 */
export function byUse<T extends Pick<Category, 'id' | 'name'>>(categories: T[], use: CategoryUse | null | undefined): T[] {
    const count = (c: T) => use?.[c.id] ?? 0
    return categories.slice().sort((a, b) => count(b) - count(a) || a.name.localeCompare(b.name))
}

/** Counts per category id from rows of `category_id` (uncategorised rows left out). */
export function countUse(rows: { category_id: string | null }[]): CategoryUse {
    const out: CategoryUse = {}
    for (const r of rows) if (r.category_id) out[r.category_id] = (out[r.category_id] ?? 0) + 1
    return out
}
