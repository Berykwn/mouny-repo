import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { categoriesService } from '@/services/accounts-categories.service'
import type { Category } from '@/types'
import { Trash2, Pencil, AlertTriangleIcon } from 'lucide-react'
import { toast } from 'sonner'

interface CategoryListProps {
    categories: Category[]
    onDeleted: (id: string) => void
    onEdit: (category: Category) => void
}

export function CategoryList({ categories, onDeleted, onEdit }: CategoryListProps) {
    const income = categories.filter(c => c.type === 'income')
    const expense = categories.filter(c => c.type === 'expense')

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this category?')) return

        const { error } = await categoriesService.remove(id)

        if (error) {
            if (error.includes('foreign key') || error.includes('violates')) {
                toast.error('Cannot delete category. It is still used in transactions.')
            } else {
                toast.error(error)
            }
            return
        }

        toast.success('Category deleted successfully.')
        onDeleted(id)
    }

    if (categories.length === 0) {
        return (
            <Alert className="max-w-md border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>No categories found</AlertTitle>
                <AlertDescription>
                    You don't have any categories set up yet. Add some to organize your transactions.
                </AlertDescription>
            </Alert>
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
                                    onClick={() => handleDelete(cat.id)}
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