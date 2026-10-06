import { CategoryTile } from '@/features/categories/components/category-icon'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryGridProps {
    categories: Category[]
    selectedId: string
    onSelect: (category: Category) => void
    disabled?: boolean
}

export function CategoryGrid({ categories, selectedId, onSelect, disabled }: CategoryGridProps) {
    if (categories.length === 0) {
        return (
            <p className="text-[11.5px] text-muted-ink py-4 text-center">
                No categories yet for this type.
            </p>
        )
    }

    return (
        <div className="grid grid-cols-4 gap-2.5">
            {categories.map((c) => {
                const selected = c.id === selectedId
                return (
                    <button
                        key={c.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelect(c)}
                        className={cn(
                            'flex flex-col items-center gap-1.5 p-2.5 rounded-[14px] border transition-all duration-150',
                            selected ? 'border-brand bg-brand-tint' : 'border-line bg-surface'
                        )}
                    >
                        <CategoryTile category={c} />
                        <span
                            className={cn(
                                'text-[11px] text-center leading-tight line-clamp-2 w-full',
                                selected ? 'text-ink font-medium' : 'text-muted-ink'
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
