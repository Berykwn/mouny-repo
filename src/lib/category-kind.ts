/**
 * What an expense category is for. Bills are paid once a period and never set the daily pace;
 * everyday and lifestyle spending do; savings are set aside, not spent. Needs are bills plus
 * everyday spending, wants are lifestyle — the split behind the 50/30/20 guide.
 */
export type CategoryKind = 'fixed' | 'daily' | 'lifestyle' | 'savings'

export const CATEGORY_KINDS: CategoryKind[] = ['fixed', 'daily', 'lifestyle', 'savings']

export const CATEGORY_KIND_META: Record<CategoryKind, { label: string; sub: string; color: string }> = {
    fixed: { label: 'Bills', sub: 'Rent, utilities, installments — paid once a period', color: '#3d6eb6' },
    daily: { label: 'Everyday', sub: 'Food, groceries, transport — sets your daily pace', color: '#6FA82B' },
    lifestyle: { label: 'Lifestyle', sub: 'Shopping, entertainment, hobbies — nice to have', color: '#d97706' },
    savings: { label: 'Savings', sub: 'Set aside, not spent — left out of pace and projections', color: '#8b5cf6' },
}

/** Bill-like names (default categories, and their usual Indonesian equivalents). */
const FIXED_NAME = /\b(rent|utilit|internet|insurance|loan|debt|subscription|receivable|education|kos|sewa|cicilan|tagihan|listrik|asuransi|langganan|pinjam|hutang|utang)/i
const LIFESTYLE_NAME = /\b(shop|entertain|travel|hobby|hobi|belanja|hiburan|liburan|jalan|nongkrong|game|gift|hadiah)/i

type KindSource = { name?: string | null; is_savings?: boolean | null; kind?: string | null }

function isKind(value: unknown): value is CategoryKind {
    return typeof value === 'string' && (CATEGORY_KINDS as string[]).includes(value)
}

/** A first guess from the name, for a new category and for rows saved before kinds existed. */
export function guessCategoryKind(name: string, isSavings = false): CategoryKind {
    if (isSavings) return 'savings'
    if (FIXED_NAME.test(name)) return 'fixed'
    if (LIFESTYLE_NAME.test(name)) return 'lifestyle'
    return 'daily'
}

/** The kind an expense's category has, falling back to a guess; uncategorized counts as everyday. */
export function resolveCategoryKind(category: KindSource | null | undefined): CategoryKind {
    if (!category) return 'daily'
    if (isKind(category.kind)) return category.kind
    return guessCategoryKind(category.name ?? '', !!category.is_savings)
}
