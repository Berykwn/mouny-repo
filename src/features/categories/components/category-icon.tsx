import { ICON_MAP } from '@/lib/icon-map'
import { cn } from '@/lib/utils'
import type { ReactNode, SVGProps } from 'react'
import { categoryTileStyle, type CategoryColors } from '../lib/category-colors'

interface CategoryIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
    name?: string | null
}

export function CategoryIcon({ name, ...props }: CategoryIconProps) {
    const Icon = (name && ICON_MAP[name]) ? ICON_MAP[name] : ICON_MAP['more-horizontal']
    return <Icon {...props} />
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
