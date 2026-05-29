import { useEffect, useState, useCallback } from 'react'
import { Plus, CalendarDays, CheckCircle, ChevronDown, Sparkles } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { OpenPeriodForm } from './components/periods/open-period-form'
import { ClosePeriodForm } from './components/periods/close-period-form'
import { AccountForm } from './components/accounts/account-form'
import { AccountList } from './components/accounts/account-list'
import { CategoryForm } from './components/categories/category-form'
import { CategoryList } from './components/categories/category-list'
import { payPeriodsService } from '@/services/pay-periods.service'
import { accountsService, categoriesService } from '@/services/accounts-categories.service'
import type { PayPeriod, Account, Category } from '@/types'
import { formatCurrency, formatDate, getDaysBetween } from '@/lib/helpers'
import { LoadingContent } from '@/components/loading-content'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function DashboardPage() {
    // — Period
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [allPeriods, setAllPeriods] = useState<PayPeriod[]>([])
    const [periodLoading, setPeriodLoading] = useState(true)
    const [periodCollapsed, setPeriodCollapsed] = useState(true)
    const [openPeriodDrawer, setOpenPeriodDrawer] = useState(false)
    const [closePeriodDrawer, setClosePeriodDrawer] = useState(false)

    // — Account
    const [accounts, setAccounts] = useState<Account[]>([])
    const [accountLoading, setAccountLoading] = useState(true)
    const [editAccount, setEditAccount] = useState<Account | null>(null)
    const [addAccountDrawer, setAddAccountDrawer] = useState(false)
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [accountCollapsed, setAccountCollapsed] = useState(true)

    // — Category
    const [categories, setCategories] = useState<Category[]>([])
    const [categoryLoading, setCategoryLoading] = useState(true)
    const [editCategory, setEditCategory] = useState<Category | null>(null)
    const [addCategoryDrawer, setAddCategoryDrawer] = useState(false)
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
    const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false)
    const [expenseCollapsed, setExpenseCollapsed] = useState(true)
    const [incomeCollapsed, setIncomeCollapsed] = useState(true)

    const daysSince = getDaysBetween(activePeriod?.start_date)

    const loadPeriods = useCallback(async () => {
        setPeriodLoading(true)
        const [{ data: active }, { data: all }] = await Promise.all([
            payPeriodsService.getActive(),
            payPeriodsService.getAll(),
        ])
        setActivePeriod(active)
        setAllPeriods(all ?? [])
        setPeriodLoading(false)
    }, [])

    const loadAccounts = useCallback(async () => {
        setAccountLoading(true)
        const { data: accs } = await accountsService.getAll()
        setAccounts(accs ?? [])
        setAccountLoading(false)
    }, [])

    const loadCategories = useCallback(async () => {
        setCategoryLoading(true)
        const { data: cats } = await categoriesService.getAll()
        setCategories(cats ?? [])
        setCategoryLoading(false)
    }, [])

    useEffect(() => {
        loadPeriods()
        loadAccounts()
        loadCategories()
    }, [loadPeriods, loadAccounts, loadCategories])

    const closedPeriods = allPeriods.filter(p => p.status === 'closed')
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
    const expenseCategories = categories.filter(c => c.type === 'expense')
    const incomeCategories = categories.filter(c => c.type === 'income')

    const handleDeleteAccount = async () => {
        if (!deletingAccountId) return
        setDeleteLoading(true)
        const { error } = await accountsService.remove(deletingAccountId)
        setDeleteLoading(false)
        if (error) {
            toast.error(error.includes('foreign key') || error.includes('violates')
                ? 'Cannot delete — account has linked transactions.'
                : error)
            setDeletingAccountId(null)
            return
        }
        setAccounts(prev => prev.filter(a => a.id !== deletingAccountId))
        setDeletingAccountId(null)
        toast.success('Account deleted.')
    }

    const handleDeleteCategory = async () => {
        if (!deletingCategoryId) return
        setDeleteCategoryLoading(true)
        const { error } = await categoriesService.remove(deletingCategoryId)
        setDeleteCategoryLoading(false)
        if (error) { toast.error(error); setDeletingCategoryId(null); return }
        setCategories(prev => prev.filter(c => c.id !== deletingCategoryId))
        setDeletingCategoryId(null)
        toast.success('Category deleted.')
    }

    return (
        <div className="px-4 pt-1.5 pb-4 space-y-3.5">

            {/* ── 1. Period card ── */}
            {periodLoading ? <LoadingContent /> : activePeriod ? (
                <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden">
                    <button
                        onClick={() => setPeriodCollapsed(v => !v)}
                        className="w-full p-4 flex items-center gap-2.5 text-left"
                    >
                        <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center shrink-0">
                            <CalendarDays className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">Active Period</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">
                                    Ongoing · {formatDate(activePeriod.start_date)}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={cn(
                            'w-4 h-4 text-muted-foreground transition-transform duration-200',
                            !periodCollapsed && 'rotate-180'
                        )} />
                    </button>
                    {!periodCollapsed && (
                        <div className="px-4 pb-4 space-y-4">
                            <div className="space-y-2 pt-1 border-t border-neutral-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Started</span>
                                    <span className="font-medium">{daysSince} days ago</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Expected income</span>
                                    <span className="font-medium">{formatCurrency(activePeriod.salary_amount)}</span>
                                </div>
                                {activePeriod.notes && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Notes</span>
                                        <span className="font-medium text-right max-w-[60%] truncate">{activePeriod.notes}</span>
                                    </div>
                                )}
                            </div>
                            <Button onClick={() => setClosePeriodDrawer(true)} className="w-full" variant="destructive">
                                <CheckCircle className="w-4 h-4" />
                                Close Period
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl border border-neutral-200 bg-card p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">No active period</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {closedPeriods.length > 0
                                ? `${closedPeriods.length} closed period${closedPeriods.length > 1 ? 's' : ''} in history`
                                : 'Start tracking your spending'}
                        </p>
                    </div>
                    <Button onClick={() => setOpenPeriodDrawer(true)} variant="outline" className="font-bold">
                        <Plus className="w-4 h-4" /> Period
                    </Button>
                </div>
            )}

            <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden">
                <button
                    onClick={() => setAccountCollapsed(v => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Total balance</p>
                        <p className={cn('text-xl font-bold mt-0.5', totalBalance < 0 ? 'text-destructive' : 'text-neutral-900')}>
                            {formatCurrency(totalBalance)}
                        </p>
                        {accounts.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                across {accounts.length} account{accounts.length > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={e => { e.stopPropagation(); setAddAccountDrawer(true) }}
                            variant="outline" size="sm" className="font-bold"
                        >
                            <Plus className="w-3.5 h-3.5" /> Account
                        </Button>
                        <ChevronDown className={cn(
                            'w-4 h-4 text-muted-foreground transition-transform duration-200',
                            !accountCollapsed && 'rotate-180'
                        )} />
                    </div>
                </button>

                {!accountCollapsed && (
                    accountLoading ? <LoadingContent /> : accounts.length === 0 ? (
                        <div
                            onClick={() => setAddAccountDrawer(true)}
                            className="border-t border-neutral-100 px-4 py-6 text-center cursor-pointer hover:bg-accent transition-colors"
                        >
                            <p className="text-sm font-medium">No accounts yet</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Tap to add a bank account or cash wallet</p>
                        </div>
                    ) : (
                        <div className="border-t border-neutral-100">
                            <AccountList
                                accounts={accounts}
                                onEdit={setEditAccount}
                                onDeleteRequest={setDeletingAccountId}
                            />
                        </div>
                    )
                )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Categories</p>
                    <div className="flex items-center gap-2">
                        {categories.length === 0 && (
                            <Button
                                onClick={async () => { await categoriesService.seedDefaults(); loadCategories() }}
                                variant="secondary" size="sm"
                            >
                                <Sparkles className="w-3 h-3" /> Seed
                            </Button>
                        )}
                        <Button onClick={() => setAddCategoryDrawer(true)} variant="outline" size="sm" className="font-bold">
                            <Plus className="w-3.5 h-3.5" /> Category
                        </Button>
                    </div>
                </div>

                {categoryLoading ? <LoadingContent /> : (
                    <>
                        {expenseCategories.length > 0 && (
                            <div className="border-t border-neutral-100">
                                <button
                                    onClick={() => setExpenseCollapsed(v => !v)}
                                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                                >
                                    <span className="flex-1 text-sm font-semibold">Expense</span>
                                    <span className="text-[11px] font-medium text-muted-foreground bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-1.5 py-0.5">
                                        {expenseCategories.length}
                                    </span>
                                    <ChevronDown className={cn(
                                        'w-4 h-4 text-muted-foreground transition-transform duration-200',
                                        !expenseCollapsed && 'rotate-180'
                                    )} />
                                </button>
                                {!expenseCollapsed && (
                                    <div className="border-t border-neutral-100">
                                        <CategoryList
                                            categories={expenseCategories}
                                            onEdit={setEditCategory}
                                            onDeleteRequest={setDeletingCategoryId}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {incomeCategories.length > 0 && (
                            <div className="border-t border-neutral-100">
                                <button
                                    onClick={() => setIncomeCollapsed(v => !v)}
                                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                                >
                                    <span className="flex-1 text-sm font-semibold">Income</span>
                                    <span className="text-[11px] font-medium text-muted-foreground bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-1.5 py-0.5">
                                        {incomeCategories.length}
                                    </span>
                                    <ChevronDown className={cn(
                                        'w-4 h-4 text-muted-foreground transition-transform duration-200',
                                        !incomeCollapsed && 'rotate-180'
                                    )} />
                                </button>
                                {!incomeCollapsed && (
                                    <div className="border-t border-neutral-100">
                                        <CategoryList
                                            categories={incomeCategories}
                                            onEdit={setEditCategory}
                                            onDeleteRequest={setDeletingCategoryId}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {categories.length === 0 && (
                            <div className="border-t border-neutral-100 px-4 py-6 text-center">
                                <p className="text-sm font-medium">No categories yet</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Tap <span className="font-medium">+ Category</span> or use <span className="font-medium">Seed defaults</span>.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <BottomDrawer open={openPeriodDrawer} onClose={() => setOpenPeriodDrawer(false)} title="Open New Period">
                <OpenPeriodForm onSuccess={() => { setOpenPeriodDrawer(false); loadPeriods() }} />
            </BottomDrawer>
            <BottomDrawer open={closePeriodDrawer} onClose={() => setClosePeriodDrawer(false)} title="Close Period">
                {activePeriod && (
                    <ClosePeriodForm
                        period={activePeriod}
                        onSuccess={() => { setClosePeriodDrawer(false); setActivePeriod(null); loadPeriods() }}
                    />
                )}
            </BottomDrawer>
            <BottomDrawer open={addAccountDrawer} onClose={() => setAddAccountDrawer(false)} title="Add Account">
                <AccountForm onSuccess={() => { setAddAccountDrawer(false); loadAccounts() }} />
            </BottomDrawer>
            <BottomDrawer open={!!editAccount} onClose={() => setEditAccount(null)} title="Edit Account">
                {editAccount && <AccountForm initial={editAccount} onSuccess={() => { setEditAccount(null); loadAccounts() }} />}
            </BottomDrawer>
            <BottomDrawer open={addCategoryDrawer} onClose={() => setAddCategoryDrawer(false)} title="Add Category">
                <CategoryForm onSuccess={() => { setAddCategoryDrawer(false); loadCategories() }} />
            </BottomDrawer>
            <BottomDrawer open={!!editCategory} onClose={() => setEditCategory(null)} title="Edit Category">
                {editCategory && <CategoryForm initial={editCategory} onSuccess={() => { setEditCategory(null); loadCategories() }} />}
            </BottomDrawer>
            <ConfirmDrawer
                open={!!deletingAccountId}
                title="Delete Account"
                description="Delete this account? This cannot be undone. Accounts with existing transactions cannot be deleted."
                confirmLabel="Delete Account"
                loading={deleteLoading}
                onConfirm={handleDeleteAccount}
                onClose={() => setDeletingAccountId(null)}
            />
            <ConfirmDrawer
                open={!!deletingCategoryId}
                title="Delete Category"
                description="Delete this category? Transactions using this category will become uncategorized."
                confirmLabel="Delete Category"
                loading={deleteCategoryLoading}
                onConfirm={handleDeleteCategory}
                onClose={() => setDeletingCategoryId(null)}
            />
        </div>
    )
}