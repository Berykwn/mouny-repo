import { useEffect, useState, useCallback } from 'react'
import { Plus, CalendarDays, LogOut, Wallet, Tag, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

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
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
    }

    const handleDeleteAccount = async () => {
        if (!deletingAccountId) return
        setDeleteLoading(true)
        const { error } = await accountsService.remove(deletingAccountId)
        setDeleteLoading(false)

        if (error) {
            if (error.includes('foreign key') || error.includes('violates')) {
                toast.error('Cannot delete account — it still has transactions linked to it.')
            } else {
                toast.error(error)
            }
            setDeletingAccountId(null)
            return
        }

        setAccounts((prev) => prev.filter((a) => a.id !== deletingAccountId))
        setDeletingAccountId(null)
        toast.success('Account deleted.')
    }

    const handleDeleteCategory = async () => {
        if (!deletingCategoryId) return
        setDeleteLoading(true)
        const { error } = await categoriesService.remove(deletingCategoryId)
        setDeleteLoading(false)

        if (error) {
            toast.error(error)
            setDeletingCategoryId(null)
            return
        }

        setCategories((prev) => prev.filter((c) => c.id !== deletingCategoryId))
        setDeletingCategoryId(null)
        toast.success('Category deleted.')
    }

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
            <div className="border-b pb-4 mb-4">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <p className="text-xs text-muted-foreground">Signed in as</p>
                        <p className="text-sm font-medium">{user?.email}</p>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="period">
                <TabsList variant="default" className="w-full">
                    <TabsTrigger value="period">
                        <CalendarDays />
                        Periods
                    </TabsTrigger>
                    <TabsTrigger value="account">
                        <Wallet />
                        Accounts
                    </TabsTrigger>
                    <TabsTrigger value="category">
                        <Tag />
                        Categories
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="period">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Your pay periods</p>
                            {!activePeriod && !loading && (
                                <Button size="sm" variant="outline" onClick={() => setOpenPeriodDrawer(true)}>
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Open Period
                                </Button>
                            )}
                        </div>

                        {loading ? (
                            <section className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex w-full flex-col gap-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                ))}
                            </section>
                        ) : activePeriod ? (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-lime-100 dark:bg-lime-900 flex items-center justify-center">
                                                <CalendarDays className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Active Period</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
                                                    <p className="text-xs text-lime-600 dark:text-lime-400 font-medium">Ongoing</p>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{daysSince} days ago</span>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <div className="space-y-1.5">
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
                                </CardContent>

                                <CardFooter>
                                    <Button
                                        variant="destructive"
                                        className='w-full'
                                        onClick={() => setClosePeriodDrawer(true)}
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Close Period
                                    </Button>
                                </CardFooter>
                            </Card>
                        ) : (
                            <div
                                onClick={() => setOpenPeriodDrawer(true)}
                                className="rounded-xl border border-dashed bg-card p-6 text-center space-y-1 cursor-pointer hover:bg-accent transition-colors"
                            >
                                <p className="text-sm font-medium">No active period</p>
                                <p className="text-xs text-muted-foreground">
                                    Tap to open a new pay period
                                </p>
                            </div>
                        )}

                        {!loading && <PeriodHistory periods={allPeriods} />}
                    </div>
                </TabsContent>

                <TabsContent value="account">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Your accounts & cash</p>
                            {accounts.length > 0 && !loading && (
                                <Button size="sm" variant="outline" onClick={() => setAddAccountDrawer(true)}>
                                    <Plus className="w-3.5 h-3.5 mr-1" />Add
                                </Button>
                            )}
                        </div>
                        {loading ? (
                            <section className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex w-full flex-col gap-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                ))}
                            </section>
                        ) : accounts.length === 0 ? (
                            <div
                                onClick={() => setAddAccountDrawer(true)}
                                className="rounded-xl border border-dashed bg-card p-6 text-center space-y-1 cursor-pointer hover:bg-accent transition-colors"
                            >
                                <p className="text-sm font-medium">No accounts yet</p>
                                <p className="text-xs text-muted-foreground">Tap to add your first account</p>
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

                <TabsContent value="category">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Labels for your transactions</p>
                            <div className="flex gap-2">
                                {categories.length === 0 && (
                                    <Button size="sm" variant="outline" onClick={async () => {
                                        await categoriesService.seedDefaults()
                                        load()
                                    }}>
                                        Seed defaults
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => setAddCategoryDrawer(true)}>
                                    <Plus className="w-3.5 h-3.5 mr-1" />Add
                                </Button>
                            </div>
                        </div>
                        {loading ? (
                            <section className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex w-full flex-col gap-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                ))}
                            </section>
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

            <BottomDrawer
                open={addAccountDrawer}
                onClose={() => setAddAccountDrawer(false)}
                title="Add Account"
            >
                <AccountForm onSuccess={() => { setAddAccountDrawer(false); load() }} />
            </BottomDrawer>

            <BottomDrawer
                open={addCategoryDrawer}
                onClose={() => setAddCategoryDrawer(false)}
                title="Add Category"
            >
                <CategoryForm onSuccess={() => { setAddCategoryDrawer(false); load() }} />
            </BottomDrawer>

            <BottomDrawer
                open={openPeriodDrawer}
                onClose={() => setOpenPeriodDrawer(false)}
                title="Open New Period"
            >
                <OpenPeriodForm onSuccess={() => { setOpenPeriodDrawer(false); load() }} />
            </BottomDrawer>

            <BottomDrawer
                open={!!editAccount}
                onClose={() => setEditAccount(null)}
                title="Edit Account"
            >
                {editAccount && (
                    <AccountForm
                        initial={editAccount}
                        onSuccess={() => { setEditAccount(null); load() }}
                    />
                )}
            </BottomDrawer>

            <BottomDrawer
                open={!!editCategory}
                onClose={() => setEditCategory(null)}
                title="Edit Category"
            >
                {editCategory && (
                    <CategoryForm
                        initial={editCategory}
                        onSuccess={() => { setEditCategory(null); load() }}
                    />
                )}
            </BottomDrawer>

            <BottomDrawer
                open={closePeriodDrawer}
                onClose={() => setClosePeriodDrawer(false)}
                title="Close Period"
            >
                {activePeriod && (
                    <ClosePeriodForm
                        period={activePeriod}
                        onSuccess={() => {
                            setClosePeriodDrawer(false);
                            setActivePeriod(null);
                            load()
                        }}
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
        </div>
    )
}