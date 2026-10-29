import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Tag } from 'lucide-react'
import { useBudgets, useCategories, usePeriods, usePeriodTransactions } from '@/queries'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { EmptyState, EMPTY_STATE_BUTTON } from '@/components/empty-state'
import { RetryInline } from '@/components/retry-inline'
import { CategoryForm } from './components/category-form'
import { CategoryList } from './components/category-list'
import { categoriesService } from '@/services/accounts-categories.service'
import { IN_USE_MESSAGE } from '@/services/_base'
import type { Category, TransactionWithDetails } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { LoadingContent } from '@/components/loading-content'
import { PageHeader } from '@/components/page-header'
import { periodProgress } from '@/features/periods/lib/period-progress'
import { BusyLabel } from '@/components/busy-label'

const NO_CATEGORIES: Category[] = []
const NO_TXS: TransactionWithDetails[] = []

export function CategoriesPage() {
    const categoriesQuery = useCategories()
    const budgetsQuery = useBudgets()
    const categories = categoriesQuery.data ?? NO_CATEGORIES
    const budgetRows = budgetsQuery.data
    const budgets = useMemo(() => {
        const map: Record<string, number> = {}
        for (const b of budgetRows ?? []) map[b.category_id] = b.amount
        return map
    }, [budgetRows])
    const loading = categoriesQuery.isPending || budgetsQuery.isPending
    // This period's totals and pace; the list still works without them.
    const { periods, activePeriod } = usePeriods()
    const { data: periodTxs = NO_TXS } = usePeriodTransactions(activePeriod?.id)
    const [tab, setTab] = useState<'expense' | 'income'>('expense')
    const [editCategory, setEditCategory] = useState<Category | null>(null)
    const [addCategoryDrawer, setAddCategoryDrawer] = useState(false)
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [seeding, setSeeding] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const topBarSlot = useTopBarSlotNode()

    // The command palette opens a category, or the add sheet, through the navigation state.
    useEffect(() => {
        const state = location.state as { add?: boolean; categoryId?: string } | null
        if (!state || loading) return
        if (state.add) setAddCategoryDrawer(true)
        const target = state.categoryId && categories.find(c => c.id === state.categoryId)
        if (target) {
            setTab(target.type === 'income' ? 'income' : 'expense')
            setEditCategory(target)
        }
        navigate(location.pathname, { replace: true, state: null })
    }, [location.state, location.pathname, loading, categories, navigate])

    const handleDeleteCategory = async () => {
        if (!deletingCategoryId) return
        setDeleteLoading(true)
        const { error } = await categoriesService.remove(deletingCategoryId)
        setDeleteLoading(false)
        if (error) {
            toast.error(error === IN_USE_MESSAGE
                ? 'Cannot delete — category is used by existing transactions.'
                : error)
            setDeletingCategoryId(null)
            return
        }
        setDeletingCategoryId(null)
        toast.success('Category deleted.')
    }

    const handleSeed = async () => {
        setSeeding(true)
        const { error } = await categoriesService.seedDefaults()
        setSeeding(false)
        if (error) { toast.error(error); return }
        toast.success('Default categories added.')
    }

    // What each category moved this period: the rows' totals and budget bars.
    const periodTotals = useMemo(() => {
        const map = new Map<string, number>()
        for (const t of periodTxs) {
            if (!t.category_id || (t.type !== 'expense' && t.type !== 'income')) continue
            map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount)
        }
        return map
    }, [periodTxs])

    const pace = activePeriod ? periodProgress(activePeriod, periods).fraction : null

    const addButton = topBarSlot && createPortal(
        <button
            type="button"
            onClick={() => setAddCategoryDrawer(true)}
            className="h-9 px-3.5 rounded-[10px] border border-line text-[13px] font-semibold text-ink hover:bg-surface-hover transition-colors flex items-center gap-1.5"
        >
            <Plus className="w-4 h-4" /> Add category
        </button>,
        topBarSlot,
    )

    return (
        <>
            <PageHeader
                title="Categories"
                back="/menu"
                action={
                    <button
                        type="button"
                        onClick={() => setAddCategoryDrawer(true)}
                        aria-label="Add category"
                        className="w-10 h-10 rounded-[12px] border border-line flex items-center justify-center text-ink hover:bg-surface-hover transition-colors"
                    >
                        <Plus aria-hidden="true" className="w-5 h-5" />
                    </button>
                }
            />
            {addButton}
            <section className="px-4 pb-6 lg:px-0 lg:max-w-3xl">
                {loading ? (
                    <LoadingContent />
                ) : categoriesQuery.error && categories.length === 0 ? (
                    <RetryInline what="Your categories" onRetry={() => void categoriesQuery.refetch()} retrying={categoriesQuery.isRefetching} />
                ) : categories.length === 0 ? (
                    <EmptyState
                        icon={Tag}
                        title="No categories yet"
                        action={
                            <button type="button" onClick={handleSeed} disabled={seeding} className={EMPTY_STATE_BUTTON}>
                                <BusyLabel busy={seeding}>Add the usual ones</BusyLabel>
                            </button>
                        }
                    >
                        Start with a ready set (food, transport, bills…) and change it as you go, or add your own with +.
                    </EmptyState>
                ) : (
                    <>
                        {/* The same pills as Plan's tabs. */}
                        <div role="tablist" aria-label="Category type" className="flex gap-2 pb-5">
                            {(['expense', 'income'] as const).map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === t}
                                    onClick={() => setTab(t)}
                                    className={cn(
                                        'h-10 px-4 rounded-full border border-line text-[14px] flex items-center transition-colors',
                                        tab === t ? 'bg-surface-hover text-ink font-semibold' : 'bg-surface text-muted-ink font-medium hover:text-ink'
                                    )}
                                >
                                    {t === 'expense' ? 'Expenses' : 'Income'}
                                </button>
                            ))}
                        </div>
                        <CategoryList
                            categories={categories}
                            type={tab}
                            budgets={budgets}
                            periodTotals={periodTotals}
                            pace={pace}
                            onOpen={setEditCategory}
                        />
                    </>
                )}

                {/* Drawers */}
                <BottomDrawer open={addCategoryDrawer} onClose={() => setAddCategoryDrawer(false)} title="New category">
                    <CategoryForm onSuccess={() => setAddCategoryDrawer(false)} />
                </BottomDrawer>
                <BottomDrawer open={!!editCategory} onClose={() => setEditCategory(null)} title={editCategory?.name ?? ''}>
                    {editCategory && (
                        <CategoryForm
                            key={editCategory.id}
                            initial={editCategory}
                            initialBudget={budgets[editCategory.id] ?? null}
                            onSuccess={() => setEditCategory(null)}
                            onDelete={() => { setDeletingCategoryId(editCategory.id); setEditCategory(null) }}
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
