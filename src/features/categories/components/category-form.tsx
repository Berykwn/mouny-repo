import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { categoriesService } from '@/services/accounts-categories.service'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Category, CategoryType } from '@/types'
import { COLORS } from '@/lib/static-colors'
import { ICON_MAP } from '@/lib/icon-map'
import { CategoryIcon } from './category-icon'
import { categoryTypeConfig, CategoryTypePicker } from './category-type-picker'

interface CategoryFormProps {
    onSuccess: () => void
    initial?: Category
}

const ICON_KEYS = Object.keys(ICON_MAP)

export function CategoryForm({ onSuccess, initial }: CategoryFormProps) {
    const [type, setType] = useState<CategoryType>((initial?.type as CategoryType) ?? 'expense')
    const [name, setName] = useState(initial?.name ?? '')
    const [color, setColor] = useState<string>(initial?.color ?? COLORS[0])
    const [icon, setIcon] = useState<string>(initial?.icon ?? ICON_KEYS[0])
    const [loading, setLoading] = useState(false)

    const isEdit = !!initial

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error('Category name is required.')
            return
        }

        setLoading(true)

        const payload = { name: name.trim(), type, color, icon }

        const { error } = isEdit
            ? await categoriesService.update(initial.id, payload)
            : await categoriesService.create(payload)

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success(isEdit ? 'Category updated successfully.' : 'Category created successfully.')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 pb-2">
            <CategoryTypePicker value={type} onChange={setType} />

            {/* Name */}
            <div className="space-y-1.5">
                <Label>Category name</Label>
                <Input
                    placeholder={categoryTypeConfig[type].sub}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                />
            </div>

            {/* Icon picker */}
            <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-8 gap-1">
                    {ICON_KEYS.map((key) => {
                        const selected = icon === key
                        return (
                            <button
                                key={key}
                                type="button"
                                title={key}
                                onClick={() => setIcon(key)}
                                className={cn(
                                    'aspect-square rounded-xl flex items-center justify-center transition-all duration-150',
                                    selected ? 'scale-105' : 'hover:bg-muted'
                                )}
                                style={selected ? { backgroundColor: color + '25' } : undefined}
                            >
                                <CategoryIcon
                                    name={key}
                                    className="w-[18px] h-[18px]"
                                    style={{ color: selected ? color : undefined }}
                                />
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-10 gap-2">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={cn(
                                'aspect-square rounded-full transition-all duration-150',
                                color === c
                                    ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                                    : 'hover:scale-105'
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: color + '25' }}
                >
                    <CategoryIcon
                        name={icon}
                        className="w-[18px] h-[18px]"
                        style={{ color }}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate leading-tight">
                        {name.trim() || <span className="text-muted-foreground italic font-normal">Category name</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{type}</p>
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isEdit ? 'Save Changes' : 'Create Category'
                }
            </Button>
        </form>
    )
}