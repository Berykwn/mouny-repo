import { useEffect, useState, useCallback, useMemo } from 'react'
import { Sparkles, Loader2, Tag } from 'lucide-react'
import { HeroAction } from '@/components/hero'
import { BudgetHero } from './components/budget-hero'
import { payPeriodsService } from '@/services/pay-periods.service'
import { transactionsService } from '@/services/transactions.service'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { CategoryForm } from './components/category-form'
import { CategoryList } from './components/category-list'
import { categoriesService } from '@/services/accounts-categories.service'
import { categoryBudgetsService } from '@/services/budgets.service'
import type { Category, PayPeriod, TransactionWithDetails } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
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
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [periodTxs, setPeriodTxs] = useState<TransactionWithDetails[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        const [
            { data: cats, error: catsError },
            { data: budgetRows, error: budgetsError },
            { data: active },
        ] = await Promise.all([
            categoriesService.getAll(),
            categoryBudgetsService.getAll(),
            payPeriodsService.getActive(),
        ])
        if (catsError || budgetsError) toast.error(catsError ?? budgetsError)
        setCategories(cats ?? [])
        const map: Record<string, number> = {}
        for (const b of budgetRows ?? []) map[b.category_id] = b.amount
        setBudgets(map)

        // The hero's budget-vs-income analysis; the page still works without it.
        setActivePeriod(active ?? null)
        if (active) {
            const { data: txs } = await transactionsService.getByPeriod(active.id)
            setPeriodTxs(txs ?? [])
        } else {
            setPeriodTxs([])
        }
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

    const budgetStats = useMemo(() => {
        // Only budgets on current expense categories count (a deleted or re-typed one may linger).
        const expenseIds = new Set(categories.filter(c => c.type === 'expense').map(c => c.id))
        const spentByCategory = new Map<string, number>()
        let periodIncome = 0
        for (const t of periodTxs) {
            if (t.type === 'income') periodIncome += t.amount
            else if (t.type === 'expense' && t.category_id) {
                spentByCategory.set(t.category_id, (spentByCategory.get(t.category_id) ?? 0) + t.amount)
            }
        }
        let totalBudget = 0
        let budgetedCount = 0
        let overBudgetCount = 0
        for (const [id, amount] of Object.entries(budgets)) {
            if (!expenseIds.has(id)) continue
            totalBudget += amount
            budgetedCount++
            if ((spentByCategory.get(id) ?? 0) > amount) overBudgetCount++
        }
        return { totalBudget, budgetedCount, overBudgetCount, periodIncome }
    }, [categories, budgets, periodTxs])

    return (
        <>
            <PageHeader title="Categories" />
            <section className="px-4 pb-4 lg:px-0 space-y-4">
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start">
                    <BudgetHero
                        categoryCount={categories.length}
                        expenseCount={expenseCount}
                        incomeCount={incomeCount}
                        totalBudget={budgetStats.totalBudget}
                        budgetedCount={budgetStats.budgetedCount}
                        overBudgetCount={budgetStats.overBudgetCount}
                        periodIncome={budgetStats.periodIncome}
                        expectedIncome={activePeriod?.salary_amount ?? null}
                        actions={
                            <>
                                {categories.length === 0 && (
                                    <HeroAction
                                        onClick={async () => {
                                            setSeeding(true)
                                            const { error } = await categoriesService.seedDefaults()
                                            setSeeding(false)
                                            if (error) { toast.error(error); return }
                                            toast.success('Default categories added.')
                                            load()
                                        }}
                                        disabled={seeding}
                                        icon={seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    >
                                        Seed
                                    </HeroAction>
                                )}
                                <HeroAction onClick={() => setAddCategoryDrawer(true)}>Category</HeroAction>
                            </>
                        }
                    />

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
                    description="Delete this category? This cannot be undone."
                    confirmLabel="Delete Category"
                    loading={deleteLoading}
                    onConfirm={handleDeleteCategory}
                    onClose={() => setDeletingCategoryId(null)}
                />
            </section>
        </>
    )
}
