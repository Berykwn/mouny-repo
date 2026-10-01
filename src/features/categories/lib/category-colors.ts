import type { CSSProperties } from 'react'

export interface CategoryColors {
    color?: string | null
    bg_color?: string | null
}

/** Tile background: the category's own bg color, or a soft tint of its icon color when unset. */
export function categoryTileStyle(category: CategoryColors | null | undefined, fallback = '#94a3b8'): CSSProperties {
    return { backgroundColor: category?.bg_color ?? `${category?.color ?? fallback}20` }
}

/** Relative luminance (0 = black, 1 = white) of a #rrggbb color. */
function luminance(hex: string): number {
    const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
    if (Number.isNaN(n)) return 0
    const channel = (c: number) => {
        const v = c / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

const LIGHT = 0.7

/**
 * The color that stands for a category in charts and bars on a white card.
 * A near-white icon color would vanish there, so the tile background stands in when it's dark enough,
 * and a neutral gray otherwise.
 */
export function categoryChartColor(category: CategoryColors | null | undefined, fallback = '#94a3b8'): string {
    const color = category?.color ?? fallback
    if (luminance(color) < LIGHT) return color
    const bg = category?.bg_color
    return bg && luminance(bg) < LIGHT ? bg : fallback
}
