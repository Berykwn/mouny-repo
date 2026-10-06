import { useEffect, useRef } from 'react'
import { CategoryTile } from '@/features/categories/components/category-icon'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryTileRailProps {
    categories: Category[]
    selectedId: string | null
    onSelect: (id: string) => void
    disabled?: boolean
}

export function CategoryTileRail({ categories, selectedId, onSelect, disabled }: CategoryTileRailProps) {
    const railRef = useRef<HTMLDivElement>(null)

    // Bring a pick made elsewhere (quick entry) into view; scrolls the rail only, not the drawer.
    useEffect(() => {
        const rail = railRef.current
        const tile = rail?.querySelector<HTMLElement>('[aria-pressed="true"]')
        if (!rail || !tile) return
        if (tile.offsetLeft < rail.scrollLeft || tile.offsetLeft + tile.offsetWidth > rail.scrollLeft + rail.clientWidth) {
            rail.scrollTo({ left: tile.offsetLeft - 8, behavior: 'smooth' })
        }
    }, [selectedId])

    if (categories.length === 0) {
        return (
            <p className="text-[11.5px] text-muted-ink py-2">
                No categories yet for this type.
            </p>
        )
    }

    return (
        <div
            ref={railRef}
            className="relative flex gap-2 overflow-x-auto pb-0.5 [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
        >
            {categories.map((c) => {
                const selected = c.id === selectedId
                return (
                    <button
                        key={c.id}
                        type="button"
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => onSelect(c.id)}
                        className={cn(
                            'flex flex-col items-center shrink-0 w-[74px] py-[11px] px-1.5 rounded-[14px] border transition-colors duration-150 [scroll-snap-align:start]',
                            selected ? 'border-brand bg-brand-tint' : 'border-line-soft bg-surface',
                            'disabled:opacity-50 disabled:pointer-events-none'
                        )}
                    >
                        <CategoryTile category={c} />
                        <span
                            className={cn(
                                'mt-1.5 text-[10px] text-center leading-tight truncate w-full',
                                selected ? 'text-brand-ink font-semibold' : 'text-muted-ink'
                            )}
                        >
                            {c.name}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
