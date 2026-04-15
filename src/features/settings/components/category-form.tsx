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

interface CategoryFormProps {
    onSuccess: () => void
    initial?: Category
}

export function CategoryForm({ onSuccess, initial }: CategoryFormProps) {
    const [type, setType] = useState<CategoryType>((initial?.type as CategoryType) ?? 'expense')
    const [name, setName] = useState(initial?.name ?? '')
    const [color, setColor] = useState(initial?.color ?? COLORS[0])
    const [loading, setLoading] = useState(false)

    const isEdit = !!initial

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error('Category name is required.')
            return
        }

        setLoading(true)

        const { error } = isEdit
            ? await categoriesService.update(initial.id, { name, type, color })
            : await categoriesService.create({ name, type, color, icon: null })

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success(isEdit ? 'Category updated successfully.' : 'Category created successfully.')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="flex rounded-lg border overflow-hidden">
                {(['expense', 'income'] as CategoryType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={cn(
                            'flex-1 py-2 text-sm font-medium transition-colors',
                            type === t
                                ? 'bg-neutral-200 text-neutral-600 font-semibold border border-neutral-300'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {t === 'expense' ? 'Expense' : 'Income'}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                <Label>Category name</Label>
                <Input
                    placeholder="Food, Transport, Salary..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                />
            </div>

            <div className="space-y-4">
                <Label>Color</Label>
                <div className="flex gap-4 flex-wrap">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={cn(
                                'w-8 h-8 rounded-full transition-all',
                                color === c
                                    ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                                    : 'hover:scale-105'
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isEdit ? 'Save Changes' : 'Submit'}
            </Button>
        </form>
    )
}