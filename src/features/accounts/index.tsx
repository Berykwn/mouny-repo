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
            <header className="rounded-[20px] border border-[#e5e5e5] bg-white p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Total balance</p>
                    {accounts.length > 0 ? (
                        <>
                            <p className={cn(
                                'text-[32px] font-medium tracking-[-0.02em] leading-none mt-1',
                                totalBalance < 0 ? 'text-[#dc2626]' : 'text-[#252525]'
                            )}>
                                {formatCurrency(totalBalance)}
                            </p>
                            <p className="text-[11px] text-[#8a8a84] mt-1.5">
                                across {accounts.length} account{accounts.length > 1 ? 's' : ''}
                            </p>
                        </>
                    ) : (
                        <p className="text-[13px] text-[#8a8a84] mt-0.5">Add your first account</p>
                    )}
                </div>
                <Button
                    onClick={() => setAddAccountDrawer(true)}
                    size="sm"
                    variant="outline"
                >
                    <Plus className="w-3.5 h-3.5" /> Account
                </Button>
            </header>

            {loading ? (
                <LoadingContent />
            ) : accounts.length === 0 ? (
                <button
                    type="button"
                    onClick={() => setAddAccountDrawer(true)}
                    className="w-full rounded-[20px] border border-[#e5e5e5] bg-white p-4 flex items-center gap-3 text-left hover:bg-[#fbfbfa] transition-colors"
                >
                    <div className="w-9 h-9 rounded-[10px] bg-[#f4f4f2] flex items-center justify-center shrink-0">
                        <Wallet2 className="w-4 h-4 text-[#8a8a84]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#252525]">No accounts yet</p>
                        <p className="text-[11.5px] text-[#8a8a84] mt-0.5">Tap to add your first bank or cash account</p>
                    </div>
                </button>
            ) : (
                <div className="space-y-3 mt-1.5">
                    <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] px-1">
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