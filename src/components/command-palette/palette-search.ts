/** What the palette can find; results come back in this order. */
export const PALETTE_GROUPS = ['Actions', 'Pages', 'Categories', 'Bills', 'Debts'] as const
export type PaletteGroup = (typeof PALETTE_GROUPS)[number]

export interface PaletteItem {
    id: string
    group: PaletteGroup
    label: string
    /** Quiet text on the right: a date, an amount, where it leads. */
    hint?: string
    /** Other words it answers to ("dashboard" for Home). */
    keywords?: string[]
}

export interface PaletteSection<T extends PaletteItem = PaletteItem> {
    group: PaletteGroup
    items: T[]
}

/** Results kept per group, so one long list doesn't push the rest off screen. */
const PER_GROUP = 5

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/**
 * How well a text answers the query: 3 when it starts with it, 2 when a word does, 1 when it
 * appears anywhere, 0 when it doesn't.
 */
export function matchScore(text: string, query: string): number {
    const t = normalize(text)
    const q = normalize(query)
    if (!q) return 1
    if (t.startsWith(q)) return 3
    if (t.split(/[\s·,./-]+/).some(w => w.startsWith(q))) return 2
    return t.includes(q) ? 1 : 0
}

/**
 * The palette's results, grouped. With no query only actions and pages show, as a menu;
 * with one, everything that matches, the best matches of each group first.
 */
export function searchPalette<T extends PaletteItem>(items: T[], query: string): PaletteSection<T>[] {
    const q = query.trim()
    const scored = items
        .filter(item => q || item.group === 'Actions' || item.group === 'Pages')
        .map((item, index) => ({
            item,
            index,
            score: Math.max(matchScore(item.label, q), ...(item.keywords ?? []).map(k => matchScore(k, q) - 0.5)),
        }))
        .filter(s => s.score > 0)

    return PALETTE_GROUPS
        .map(group => ({
            group,
            items: scored
                .filter(s => s.item.group === group)
                // Stable within a score, so an empty query keeps the given order.
                .sort((a, b) => b.score - a.score || a.index - b.index)
                .slice(0, q ? PER_GROUP : undefined)
                .map(s => s.item),
        }))
        .filter(section => section.items.length > 0)
}
