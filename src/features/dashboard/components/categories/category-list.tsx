import type { Category } from '@/types'
import { Trash2, Pencil } from 'lucide-react'

interface CategoryListProps {
    categories: Category[]
    onEdit: (category: Category) => void
    onDeleteRequest: (id: string) => void
}

export function CategoryList({ categories, onEdit, onDeleteRequest }: CategoryListProps) {
    const expense = categories.filter(c => c.type === 'expense')
    const income = categories.filter(c => c.type === 'income')

    if (categories.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-card p-8 text-center space-y-1">
                <p className="text-sm font-medium">No categories yet</p>
                <p className="text-xs text-muted-foreground">
                    Tap <span className="font-medium">Add</span> or use <span className="font-medium">Seed defaults</span>.
                </p>
            </div>
        )
    }

    const Section = ({ label, items }: { label: string; items: Category[] }) => {
        if (items.length === 0) return null
        return (
            <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
                    {label}
                </p>
                <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden divide-y divide-neutral-100">
                    {items.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color ?? '#94a3b8' }}
                            />
                            <p className="text-sm flex-1">{cat.name}</p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onEdit(cat)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onDeleteRequest(cat.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Section label="Expenses" items={expense} />
            <Section label="Income" items={income} />
        </div>
    )
}