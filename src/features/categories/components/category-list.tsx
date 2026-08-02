import type { Category } from '@/types'
import { Trash2, Pencil } from 'lucide-react'
import { CategoryIcon } from './category-icon'

interface CategoryListProps {
    categories: Category[]
    onEdit: (category: Category) => void
    onDeleteRequest: (id: string) => void
}

export function CategoryList({ categories, onEdit, onDeleteRequest }: CategoryListProps) {
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
                <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] px-1">
                    {label}
                </p>
                <div className="rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden divide-y divide-[#f2f2f0]">
                    {items.map((cat) => {
                        const color = cat.color ?? '#94a3b8'
                        return (
                            <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5">
                                <div
                                    className="w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: color + '25' }}
                                >
                                    <CategoryIcon
                                        name={cat.icon}
                                        className="w-[15px] h-[15px]"
                                        style={{ color }}
                                    />
                                </div>
                                <p className="text-[13px] text-[#252525] flex-1">{cat.name}</p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onEdit(cat)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#8a8a84] hover:text-[#252525] hover:bg-[#f4f4f2] transition-colors"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => onDeleteRequest(cat.id)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#8a8a84] hover:text-[#dc2626] hover:bg-[#f4f4f2] transition-colors"
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
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start lg:space-y-0">
            <Section label="Expenses" items={expense} />
            <Section label="Income" items={income} />
        </div>
    )
}
