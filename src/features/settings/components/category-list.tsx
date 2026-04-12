import type { Category } from '@/types'
import { Trash2, Pencil } from 'lucide-react'

interface CategoryListProps {
    categories: Category[]
    onEdit: (category: Category) => void
    onDeleteRequest: (id: string) => void
}

export function CategoryList({ categories, onEdit, onDeleteRequest }: CategoryListProps) {
    const income = categories.filter(c => c.type === 'income')
    const expense = categories.filter(c => c.type === 'expense')

    if (categories.length === 0) {
        return (
            <div
                className="bg-card p-6 text-center space-y-1 cursor-pointer hover:bg-accent transition-colors"
            >
                <p className="text-sm font-medium">No categories found</p>
                <p className="text-xs text-muted-foreground">
                    Click <span className="font-medium">Add</span> or use <span className="font-medium">Seed Default</span>.
                </p>
            </div>
        )
    }

    const Section = ({ label, items }: { label: string; items: Category[] }) => {
        if (items.length === 0) return null
        return (
            <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                    {label}
                </p>
                <div className="rounded-xl border bg-card overflow-hidden divide-y">
                    {items.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5 group">
                            <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color ?? '#94a3b8' }}
                            />
                            <p className="text-sm flex-1">{cat.name}</p>
                            <div className="flex items-center gap-1 transition-opacity">
                                <button
                                    onClick={() => onEdit(cat)}
                                    className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onDeleteRequest(cat.id)}
                                    className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
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