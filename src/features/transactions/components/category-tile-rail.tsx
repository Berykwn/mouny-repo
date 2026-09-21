import { CategoryIcon } from '@/features/categories/components/category-icon'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryTileRailProps {
    categories: Category[]
    selectedId: string | null
    onSelect: (id: string) => void
    disabled?: boolean
}

export function CategoryTileRail({ categories, selectedId, onSelect, disabled }: CategoryTileRailProps) {
    if (categories.length === 0) {
        return (
            <p className="text-[11.5px] text-[#8a8a84] py-2">
                No categories yet for this type.
            </p>
        )
    }

    return (
        <div
            className="flex gap-2 overflow-x-auto pb-0.5 [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
        >
            {categories.map((c) => {
                const selected = c.id === selectedId
                return (
                    <button
                        key={c.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelect(c.id)}
                        className={cn(
                            'flex flex-col items-center shrink-0 w-[74px] py-[11px] px-1.5 rounded-[14px] border transition-colors duration-150 [scroll-snap-align:start]',
                            selected ? 'border-[#6FA82B] bg-[#f7faf2]' : 'border-[#eeeeec] bg-white',
                            'disabled:opacity-50 disabled:pointer-events-none'
                        )}
                    >
                        <div
                            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: c.color ? `${c.color}1f` : undefined }}
                        >
                            <CategoryIcon name={c.icon} className="w-4 h-4" style={{ color: c.color ?? undefined }} />
                        </div>
                        <span
                            className={cn(
                                'mt-1.5 text-[10px] text-center leading-tight truncate w-full',
                                selected ? 'text-[#4d7a1d] font-semibold' : 'text-[#8a8a84]'
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
