import type { Category } from '@/types'
import { Trash2, Pencil } from 'lucide-react'
import { CategoryIcon } from './category-icon'
import { formatCurrency } from '@/lib/helpers'

interface CategoryListProps {
    categories: Category[]
    budgets: Record<string, number>
    onEdit: (category: Category) => void
    onDeleteRequest: (id: string) => void
}

export function CategoryList({ categories, budgets, onEdit, onDeleteRequest }: CategoryListProps) {
    const expense = categories
        .filter(c => c.type === 'expense')
        .sort(
            (a, b) =>
                new Date(b.created_at ?? 0).getTime() -
                new Date(a.created_at ?? 0).getTime()
        )

    const income = categories
        .filter(c => c.type === 'income')
        .sort(
            (a, b) =>
                new Date(b.created_at ?? 0).getTime() -
                new Date(a.created_at ?? 0).getTime()
        )

    const Section = ({ label, items }: { label: string; items: Category[] }) => {
        if (items.length === 0) return null
        return (
            <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-1">
                    {label} <span className="text-subtle-ink">· {items.length}</span>
                </p>
                <div className="card overflow-hidden divide-y divide-line-soft">
                    {items.map((cat) => {
                        const color = cat.color ?? '#94a3b8'
                        return (
                            <div
                                key={cat.id}
                                className="flex items-center gap-3 px-4 py-[9px]"
                            >
                                <div
                                    className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: color + '25' }}
                                >
                                    <CategoryIcon
                                        name={cat.icon}
                                        className="w-4 h-4"
                                        style={{ color }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-ink truncate">{cat.name}</p>
                                    {cat.type === 'expense' && budgets[cat.id] !== undefined && (
                                        <p className="text-[11px] text-muted-ink truncate">
                                            {formatCurrency(budgets[cat.id])}/period
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center shrink-0">
                                    <button
                                        onClick={() => onEdit(cat)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-ink hover:text-ink hover:bg-surface-hover transition-colors"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => onDeleteRequest(cat.id)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-ink hover:text-negative hover:bg-surface-hover transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
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
