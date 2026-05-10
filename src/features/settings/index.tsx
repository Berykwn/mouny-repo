import { useEffect, useState, useCallback } from 'react'
import { Plus, CalendarDays, LogOut, Wallet, Tag, CheckCircle, Sparkles } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { OpenPeriodForm } from './components/open-period-form'
import { PeriodHistory } from './components/period-history'
import { AccountForm } from './components/account-form'
import { AccountList } from './components/account-list'
import { CategoryForm } from './components/category-form'
import { CategoryList } from './components/category-list'
import { ClosePeriodForm } from './components/close-period-form'
import { payPeriodsService } from '@/services/pay-periods.service'
import { accountsService, categoriesService } from '@/services/accounts-categories.service'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import type { PayPeriod, Account, Category } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate, getDaysBetween } from '@/lib/helpers'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
    const { user } = useAuth()
    const navigate = useNavigate()

    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [allPeriods, setAllPeriods] = useState<PayPeriod[]>([])
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [editAccount, setEditAccount] = useState<Account | null>(null)
    const [editCategory, setEditCategory] = useState<Category | null>(null)
    const [addAccountDrawer, setAddAccountDrawer] = useState(false)
    const [addCategoryDrawer, setAddCategoryDrawer] = useState(false)
    const [openPeriodDrawer, setOpenPeriodDrawer] = useState(false)
    const [closePeriodDrawer, setClosePeriodDrawer] = useState(false)
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [logoutConfirm, setLogoutConfirm] = useState(false)

    const daysSince = getDaysBetween(activePeriod?.start_date)

    const load = useCallback(async () => {
        setLoading(true)
        const [{ data: active }, { data: all }, { data: accs }, { data: cats }] = await Promise.all([
            payPeriodsService.getActive(),
            payPeriodsService.getAll(),
            accountsService.getAll(),
            categoriesService.getAll(),
        ])
        setActivePeriod(active)
        setAllPeriods(all ?? [])
        setAccounts(accs ?? [])
        setCategories(cats ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleLogout = async () => {
        setLogoutConfirm(false)
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
    }

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
        setDeleteLoading(true)
        const { error } = await categoriesService.remove(deletingCategoryId)
        setDeleteLoading(false)
        if (error) { toast.error(error); setDeletingCategoryId(null); return }
        setCategories(prev => prev.filter(c => c.id !== deletingCategoryId))
        setDeletingCategoryId(null)
        toast.success('Category deleted.')
    }

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
    const expenseCount = categories.filter(c => c.type === 'expense').length
    const incomeCount = categories.filter(c => c.type === 'income').length
    const closedPeriods = allPeriods.filter(p => p.status === 'closed')

    return (
        <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">

            {/* User card */}
            <div className="rounded-2xl border border-neutral-200 bg-card px-4 py-3 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Signed in as</p>
                    <p className="text-sm font-medium mt-0.5">{user?.email}</p>
                </div>
                <button
                    onClick={() => setLogoutConfirm(true)}
                    className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                >
                    <LogOut className="w-3.5 h-3.5" />
                </button>
            </div>

            <Tabs defaultValue="period">
                <TabsList variant="default" className="w-full">
                    <TabsTrigger value="period"><CalendarDays />Periods</TabsTrigger>
                    <TabsTrigger value="account"><Wallet />Accounts</TabsTrigger>
                    <TabsTrigger value="category"><Tag />Categories</TabsTrigger>
                </TabsList>

                {/* ── PERIODS ── */}
                <TabsContent value="period">
                    <div className="space-y-3 pt-3">
                        {loading ? <LoadingContent /> : (
                            <>
                                {activePeriod ? (
                                    /* Active period card */
                                    <div className="rounded-2xl border border-neutral-200 bg-card p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-lime-100 dark:bg-lime-900 flex items-center justify-center shrink-0">
                                                    <CalendarDays className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold">Active Period</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
                                                        <p className="text-[10px] text-lime-600 dark:text-lime-400 font-medium">Ongoing</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">{daysSince} days ago</span>
                                        </div>

                                        <div className="space-y-2 pt-1 border-t border-neutral-100">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Start</span>
                                                <span className="font-medium">{formatDate(activePeriod.start_date)}</span>
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

                                        <button
                                            onClick={() => setClosePeriodDrawer(true)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Close Period
                                        </button>
                                    </div>
                                ) : (
                                    /* No active period — CTA card */
                                    <div className="rounded-2xl border border-neutral-200 bg-card p-4 flex items-center gap-3">
                                        {/* <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0">
                                            <CalendarDays className="w-4 h-4 text-amber-500" />
                                        </div> */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold">No active period</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {closedPeriods.length > 0
                                                    ? `${closedPeriods.length} closed period${closedPeriods.length > 1 ? 's' : ''} in history`
                                                    : 'Start tracking your spending'}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setOpenPeriodDrawer(true)}
                                            variant='outline'
                                            className='font-bold'
                                        >
                                            <Plus className="w-4 h-4" /> Period
                                        </Button>
                                    </div>
                                )}

                                {/* Period history — always shown if has data */}
                                <PeriodHistory periods={allPeriods} />
                            </>
                        )}
                    </div>
                </TabsContent>

                {/* ── ACCOUNTS ── */}
                <TabsContent value="account">
                    <div className="space-y-3 pt-3">
                        {/* Header summary card */}
                        <div className="rounded-2xl border border-neutral-200 bg-card p-4 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Total balance</p>
                                {accounts.length > 0 ? (
                                    <>
                                        <p className={cn('text-xl font-bold mt-0.5', totalBalance < 0 ? 'text-destructive' : 'text-primary')}>
                                            {formatCurrency(totalBalance)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            across {accounts.length} account{accounts.length > 1 ? 's' : ''}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground mt-0.5">Add your first account</p>
                                )}
                            </div>
                            <Button
                                onClick={() => setAddAccountDrawer(true)}
                                variant='outline'
                                className='font-bold'
                            >
                                <Plus className="w-4 h-4" />
                                Accounts
                            </Button>
                        </div>

                        {loading ? <LoadingContent /> : accounts.length === 0 ? (
                            <div
                                onClick={() => setAddAccountDrawer(true)}
                                className="rounded-2xl border border-dashed border-neutral-300 bg-card p-8 text-center space-y-2 cursor-pointer hover:bg-accent transition-colors"
                            >
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mx-auto">
                                    <Wallet className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">No accounts yet</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Tap to add a bank account or cash wallet</p>
                                </div>
                            </div>
                        ) : (
                            <AccountList
                                accounts={accounts}
                                onEdit={setEditAccount}
                                onDeleteRequest={setDeletingAccountId}
                            />
                        )}
                    </div>
                </TabsContent>

                {/* ── CATEGORIES ── */}
                <TabsContent value="category">
                    <div className="space-y-3 pt-3">
                        {/* Header summary card */}
                        <div className="rounded-2xl border border-neutral-200 bg-card p-4 flex items-center gap-3">
                            {/* <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center shrink-0">
                                <Tag className="w-4 h-4 text-rose-500" />
                            </div> */}
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
                                        variant='secondary'
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
                        </div>

                        {loading ? <LoadingContent /> : categories.length === 0 ? (
                            <div className="rounded-2xl border border-neutral-200 bg-card p-8 text-center space-y-3">
                                {/* <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950 flex items-center justify-center mx-auto">
                                    <Tag className="w-5 h-5 text-violet-400" />
                                </div> */}
                                <div>
                                    <p className="text-sm font-medium">No categories yet</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Add manually or seed with common defaults
                                    </p>
                                </div>
                                <button
                                    onClick={async () => { await categoriesService.seedDefaults(); load() }}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl bg-muted hover:bg-accent transition-colors"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Seed defaults
                                </button>
                            </div>
                        ) : (
                            <CategoryList
                                categories={categories}
                                onEdit={setEditCategory}
                                onDeleteRequest={setDeletingCategoryId}
                            />
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Drawers */}
            <BottomDrawer open={addAccountDrawer} onClose={() => setAddAccountDrawer(false)} title="Add Account">
                <AccountForm onSuccess={() => { setAddAccountDrawer(false); load() }} />
            </BottomDrawer>
            <BottomDrawer open={addCategoryDrawer} onClose={() => setAddCategoryDrawer(false)} title="Add Category">
                <CategoryForm onSuccess={() => { setAddCategoryDrawer(false); load() }} />
            </BottomDrawer>
            <BottomDrawer open={openPeriodDrawer} onClose={() => setOpenPeriodDrawer(false)} title="Open New Period">
                <OpenPeriodForm onSuccess={() => { setOpenPeriodDrawer(false); load() }} />
            </BottomDrawer>
            <BottomDrawer open={!!editAccount} onClose={() => setEditAccount(null)} title="Edit Account">
                {editAccount && <AccountForm initial={editAccount} onSuccess={() => { setEditAccount(null); load() }} />}
            </BottomDrawer>
            <BottomDrawer open={!!editCategory} onClose={() => setEditCategory(null)} title="Edit Category">
                {editCategory && <CategoryForm initial={editCategory} onSuccess={() => { setEditCategory(null); load() }} />}
            </BottomDrawer>
            <BottomDrawer open={closePeriodDrawer} onClose={() => setClosePeriodDrawer(false)} title="Close Period">
                {activePeriod && (
                    <ClosePeriodForm
                        period={activePeriod}
                        onSuccess={() => { setClosePeriodDrawer(false); setActivePeriod(null); load() }}
                    />
                )}
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
                loading={deleteLoading}
                onConfirm={handleDeleteCategory}
                onClose={() => setDeletingCategoryId(null)}
            />
            <ConfirmDrawer
                open={logoutConfirm}
                title="Logout"
                description="Are you sure you want to logout?"
                confirmLabel="Logout"
                loading={false}
                onConfirm={handleLogout}
                onClose={() => setLogoutConfirm(false)}
            />
        </div>
    )
}