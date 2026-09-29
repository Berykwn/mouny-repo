import { ICON_MAP } from '@/lib/icon-map'
import { cn } from '@/lib/utils'
import type { CSSProperties, ReactNode, SVGProps } from 'react'

interface CategoryIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
    name?: string | null
}

export function CategoryIcon({ name, ...props }: CategoryIconProps) {
    const Icon = (name && ICON_MAP[name]) ? ICON_MAP[name] : ICON_MAP['more-horizontal']
    return <Icon {...props} />
}

interface CategoryColors {
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

interface CategoryTileProps {
    category: (CategoryColors & { icon?: string | null }) | null | undefined
    /** Tint and icon color used when the category has no color. */
    fallback?: string
    className?: string
    /** Replaces the category icon, e.g. an income/expense glyph for uncategorized rows. */
    children?: ReactNode
}

/** The one standard category tile (32px plate, 18px icon) shared by every page. */
export function CategoryTile({ category, fallback = '#94a3b8', className, children }: CategoryTileProps) {
    return (
        <div
            className={cn('w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0', className)}
            style={categoryTileStyle(category, fallback)}
        >
            {children || (
                <CategoryIcon
                    name={category?.icon}
                    className="w-[18px] h-[18px]"
                    style={{ color: category?.color ?? fallback }}
                />
            )}
        </div>
    )
}
