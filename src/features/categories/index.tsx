import { useEffect, useState, useCallback } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { CategoryForm } from './components/category-form'
import { CategoryList } from './components/category-list'
import { categoriesService } from '@/services/accounts-categories.service'
import type { Category } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { Button } from '@/components/ui/button'

export function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [editCategory, setEditCategory] = useState<Category | null>(null)
    const [addCategoryDrawer, setAddCategoryDrawer] = useState(false)
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const { data: cats } = await categoriesService.getAll()
        setCategories(cats ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleDeleteCategory = async () => {
        if (!deletingCategoryId) return
        setDeleteLoading(true)
        const { error } = await categoriesService.remove(deletingCategoryId)
        setDeleteLoading(false)
        if (error) { toast.error(error); setDeletingCategoryId(null); return }
        setCategories(prev => prev.filter(c => c.id !== deletingCategoryId))
        setDeletingCategoryId(null)
        toast.success('Category deleted.')
    }

    const expenseCount = categories.filter(c => c.type === 'expense').length
    const incomeCount = categories.filter(c => c.type === 'income').length

    return (
        <section className="px-4 pt-1.5 pb-4 space-y-4">
            <header className="rounded-2xl border border-neutral-200 bg-card p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Categories</p>
                    {categories.length > 0 ? (
                        <>
                            <p className="text-xl font-bold mt-0.5">{categories.length}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {expenseCount} expense · {incomeCount} income
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground mt-0.5">No categories yet</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {categories.length === 0 && (
                        <Button
                            onClick={async () => { await categoriesService.seedDefaults(); load() }}
                            className='bg-rose-400 text-white font-bold'
                        >
                            <Sparkles className="w-3 h-3" />
                            Seed
                        </Button>
                    )}
                    <Button
                        onClick={() => setAddCategoryDrawer(true)}
                        variant='outline'
                        className='font-bold'
                    >
                        <Plus className="w-4 h-4" /> Category
                    </Button>
                </div>
            </header>

            {loading ? (
                <LoadingContent />
            ) : (
                <CategoryList
                    categories={categories}
                    onEdit={setEditCategory}
                    onDeleteRequest={setDeletingCategoryId}
                />
            )}

            {/* Drawers */}
            <BottomDrawer open={addCategoryDrawer} onClose={() => setAddCategoryDrawer(false)} title="Add Category">
                <CategoryForm onSuccess={() => { setAddCategoryDrawer(false); load() }} />
            </BottomDrawer>
            <BottomDrawer open={!!editCategory} onClose={() => setEditCategory(null)} title="Edit Category">
                {editCategory && <CategoryForm initial={editCategory} onSuccess={() => { setEditCategory(null); load() }} />}
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
    )
}