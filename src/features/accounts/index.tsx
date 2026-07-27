import { useEffect, useState, useCallback } from 'react'
import { Plus, Wallet2 } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { AccountForm } from './components/account-form'
import { AccountList } from './components/account-list'
import { accountsService } from '@/services/accounts-categories.service'
import type { Account } from '@/types'
import { formatCurrency } from '@/lib/helpers'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function AccountPage() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [editAccount, setEditAccount] = useState<Account | null>(null)
    const [addAccountDrawer, setAddAccountDrawer] = useState(false)
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const { data: accs } = await accountsService.getAll()
        setAccounts(accs ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

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

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

    return (
        <section className="px-4 pb-4 space-y-4">
            <header className="rounded-2xl border border-neutral-200 bg-card p-4 flex items-center gap-3">
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
            </header>

            {loading ? (
                <LoadingContent />
            ) : accounts.length === 0 ? (
                <div
                    onClick={() => setAddAccountDrawer(true)}
                    className="rounded-2xl border border-dashed border-neutral-300 bg-card p-8 text-center space-y-2 cursor-pointer hover:bg-accent transition-colors"
                >
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center mx-auto">
                        <Wallet2 className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">No accounts yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Tap to add your first bank or cash account</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3 mt-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
                        Your accounts
                    </p>

                    <AccountList
                        accounts={accounts}
                        onEdit={setEditAccount}
                        onDeleteRequest={setDeletingAccountId}
                    />
                </div>
            )}

            {/* Drawers */}
            <BottomDrawer open={addAccountDrawer} onClose={() => setAddAccountDrawer(false)} title="Add Account">
                <AccountForm onSuccess={() => { setAddAccountDrawer(false); load() }} />
            </BottomDrawer>
            <BottomDrawer open={!!editAccount} onClose={() => setEditAccount(null)} title="Edit Account">
                {editAccount &&
                    <AccountForm
                        initial={editAccount}
                        onSuccess={() => {
                            setEditAccount(null);
                            load();
                        }}
                        allAccounts={accounts}
                    />}
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
        </section>
    )
}