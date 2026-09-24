import { useEffect, useState, useCallback } from 'react'
import { Plus, Sparkles, Loader2, Tag } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { CategoryForm } from './components/category-form'
import { CategoryList } from './components/category-list'
import { categoriesService } from '@/services/accounts-categories.service'
import { categoryBudgetsService } from '@/services/budgets.service'
import type { Category } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'

export function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [budgets, setBudgets] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [editCategory, setEditCategory] = useState<Category | null>(null)
    const [addCategoryDrawer, setAddCategoryDrawer] = useState(false)
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [seeding, setSeeding] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const [{ data: cats }, { data: budgetRows }] = await Promise.all([
            categoriesService.getAll(),
            categoryBudgetsService.getAll(),
        ])
        setCategories(cats ?? [])
        const map: Record<string, number> = {}
        for (const b of budgetRows ?? []) map[b.category_id] = b.amount
        setBudgets(map)
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleDeleteCategory = async () => {
        if (!deletingCategoryId) return
        setDeleteLoading(true)
        const { error } = await categoriesService.remove(deletingCategoryId)
        setDeleteLoading(false)
        if (error) {
            toast.error(error.includes('foreign key') || error.includes('violates')
                ? 'Cannot delete — category is used by existing transactions.'
                : error)
            setDeletingCategoryId(null)
            return
        }
        setCategories(prev => prev.filter(c => c.id !== deletingCategoryId))
        setDeletingCategoryId(null)
        toast.success('Category deleted.')
    }

    const expenseCount = categories.filter(c => c.type === 'expense').length
    const incomeCount = categories.filter(c => c.type === 'income').length

    return (
        <>
            <PageHeader title="Categories" />
            <section className="px-4 pb-4 lg:px-0 space-y-4">
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start">
                    <header className="card p-4 flex items-center gap-3 lg:order-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Categories</p>
                            {categories.length > 0 ? (
                                <>
                                    <p className="text-[20px] font-semibold text-ink mt-0.5">{categories.length}</p>
                                    <p className="text-[11px] text-muted-ink mt-0.5">
                                        {expenseCount} expense · {incomeCount} income
                                    </p>
                                </>
                            ) : (
                                <p className="text-[13px] text-muted-ink mt-0.5">No categories yet</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {categories.length === 0 && (
                                <Button
                                    onClick={async () => {
                                        setSeeding(true)
                                        const { error } = await categoriesService.seedDefaults()
                                        setSeeding(false)
                                        if (error) { toast.error(error); return }
                                        toast.success('Default categories added.')
                                        load()
                                    }}
                                    disabled={seeding}
                                    size="sm"
                                    variant="outline"
                                >
                                    {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    Seed
                                </Button>
                            )}
                            <Button
                                onClick={() => setAddCategoryDrawer(true)}
                                size="sm"
                                variant="outline"
                            >
                                <Plus className="w-3.5 h-3.5" /> Category
                            </Button>
                        </div>
                    </header>

                    <div className="lg:order-1">
                        {loading ? (
                            <LoadingContent />
                        ) : categories.length === 0 ? (
                            <button
                                type="button"
                                onClick={() => setAddCategoryDrawer(true)}
                                className="card w-full p-4 flex items-center gap-3 text-left hover:bg-surface-hover transition-colors"
                            >
                                <div className="w-9 h-9 rounded-[10px] bg-info/10 flex items-center justify-center shrink-0">
                                    <Tag className="w-4 h-4 text-info" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-ink">No categories yet</p>
                                    <p className="text-[11.5px] text-muted-ink mt-0.5">Tap to add one, or use Seed above for defaults</p>
                                </div>
                            </button>
                        ) : (
                            <CategoryList
                                categories={categories}
                                budgets={budgets}
                                onEdit={setEditCategory}
                                onDeleteRequest={setDeletingCategoryId}
                            />
                        )}
                    </div>
                </div>

                {/* Drawers */}
                <BottomDrawer open={addCategoryDrawer} onClose={() => setAddCategoryDrawer(false)} title="Add Category">
                    <CategoryForm onSuccess={() => { setAddCategoryDrawer(false); load() }} />
                </BottomDrawer>
                <BottomDrawer open={!!editCategory} onClose={() => setEditCategory(null)} title="Edit Category">
                    {editCategory && (
                        <CategoryForm
                            initial={editCategory}
                            initialBudget={budgets[editCategory.id] ?? null}
                            onSuccess={() => { setEditCategory(null); load() }}
                        />
                    )}
                </BottomDrawer>

                <ConfirmDrawer
                    open={!!deletingCategoryId}
                    title="Delete Category"
                    description="Delete this category? Transactions using this category will become uncategorized."
                    confirmLabel="Delete Category"
                    loading={deleteLoading}
                    onConfirm={handleDeleteCategory}
                    onClose={() => setDeletingCategoryId(null)}
                />
            </section>
        </>
    )
}
