import { cn } from '@/lib/utils'
import { CATEGORY_KINDS, CATEGORY_KIND_META, type CategoryKind } from '@/lib/category-kind'
import { CATEGORY_KIND_ICON } from '../lib/category-kind-icons'

interface CategoryKindPickerProps {
    value: CategoryKind
    onChange: (kind: CategoryKind) => void
    disabled?: boolean
}

/** Bills, everyday, lifestyle or savings — the same tile language as the type picker above it. */
export function CategoryKindPicker({ value, onChange, disabled }: CategoryKindPickerProps) {
    return (
        <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
                {CATEGORY_KINDS.map((k) => {
                    const meta = CATEGORY_KIND_META[k]
                    const Icon = CATEGORY_KIND_ICON[k]
                    const selected = value === k
                    return (
                        <button
                            key={k}
                            type="button"
                            disabled={disabled}
                            aria-pressed={selected}
                            onClick={() => onChange(k)}
                            className={cn(
                                'flex items-center gap-2.5 rounded-[14px] border-[1.5px] p-2.5 text-left transition-all duration-150 disabled:opacity-50',
                                selected ? '' : 'border-line bg-white hover:border-[#d4d4d4]'
                            )}
                            style={selected ? { borderColor: meta.color, backgroundColor: `${meta.color}14` } : undefined}
                        >
                            <span
                                className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]', !selected && 'bg-surface-hover text-muted-ink')}
                                style={selected ? { backgroundColor: `${meta.color}24`, color: meta.color } : undefined}
                            >
                                <Icon className="h-4 w-4" strokeWidth={1.9} />
                            </span>
                            <span className="text-[13px] font-medium text-ink">{meta.label}</span>
                        </button>
                    )
                })}
            </div>
            <p className="text-[10.5px] text-subtle-ink">{CATEGORY_KIND_META[value].sub}</p>
        </div>
    )
}
