import { useState, useMemo } from 'react'
import { WalletIcon } from '@/components/account-type-icon'
import { WALLET_TILE_CLASS } from '@/lib/account-tiles'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { AccountForm } from './components/account-form'
import { AccountList } from './components/account-list'
import { AccountsHero } from './components/accounts-hero'
import { BalanceTrend } from './components/balance-trend'
import { AccountDetail } from './components/account-detail'
import {
    accountInsights, accountShares, balanceTrend, daysIntoPeriod, totalRunwayDays,
} from './lib/account-insights'
import { accountsService } from '@/services/accounts-categories.service'
import { IN_USE_MESSAGE } from '@/services/_base'
import { useAccounts, useArchivedAccounts, usePeriods, usePeriodTransactions } from '@/queries'
import type { Account, TransactionWithDetails } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { ArchivedAccounts } from './components/archived-accounts'
import { PageHeader } from '@/components/page-header'

const NO_ACCOUNTS: Account[] = []
const NO_TXS: TransactionWithDetails[] = []

export function AccountPage() {
    const accountsQuery = useAccounts()
    const accounts = accountsQuery.data ?? NO_ACCOUNTS
    const loading = accountsQuery.isPending
    // Activity, runway and trend are extras: the list still works if these fail.
    const { periods, activePeriod } = usePeriods()
    const { data: periodTxs = NO_TXS } = usePeriodTransactions(activePeriod?.id)
    const [editAccount, setEditAccount] = useState<Account | null>(null)
    const [addAccountDrawer, setAddAccountDrawer] = useState(false)
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [openAccount, setOpenAccount] = useState<Account | null>(null)
    const [editTab, setEditTab] = useState<'edit' | 'transfer'>('edit')
    const [archivingAccount, setArchivingAccount] = useState<Account | null>(null)
    const [archiveLoading, setArchiveLoading] = useState(false)
    const { data: archived = NO_ACCOUNTS } = useArchivedAccounts()

    const handleDeleteAccount = async () => {
        if (!deletingAccountId) return
        const account = accounts.find(a => a.id === deletingAccountId)
        setDeleteLoading(true)
        const { error } = await accountsService.remove(deletingAccountId)
        setDeleteLoading(false)
        setDeletingAccountId(null)
        if (error === IN_USE_MESSAGE && account) {
            // It has history, so it can only be archived, and only once it's empty.
            if (account.balance !== 0) {
                toast.error(`${account.name} has transactions, so it can’t be deleted. Move its ${formatCurrency(account.balance)} out, then archive it.`)
            } else {
                setArchivingAccount(account)
            }
            return
        }
        if (error) { toast.error(error); return }
        toast.success('Account deleted.')
    }

    const handleArchiveAccount = async () => {
        if (!archivingAccount) return
        setArchiveLoading(true)
        const { error } = await accountsService.archive(archivingAccount.id)
        setArchiveLoading(false)
        if (error) { toast.error(error); return }
        toast.success(`${archivingAccount.name} archived.`)
        setArchivingAccount(null)
    }

    const handleRestoreAccount = async (account: Account) => {
        const { error } = await accountsService.restore(account.id)
        if (error) { toast.error(error); return }
        toast.success(`${account.name} restored.`)
    }

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
    // Savings accounts are set aside: they count in the total, not in what spending can use.
    const savingsBalance = accounts.filter(a => a.is_savings).reduce((s, a) => s + a.balance, 0)

    const daysElapsed = daysIntoPeriod(activePeriod)
    const insights = useMemo(() => accountInsights(accounts, periodTxs, daysElapsed), [accounts, periodTxs, daysElapsed])
    const shares = useMemo(() => accountShares(accounts), [accounts])
    const trend = useMemo(() => balanceTrend(periods, totalBalance), [periods, totalBalance])
    const runwayDays = totalRunwayDays(totalBalance - savingsBalance, periodTxs, daysElapsed)
    let overdrawnCount = 0
    let lowCount = 0
    for (const info of insights.values()) {
        if (info.health === 'overdrawn') overdrawnCount++
        else if (info.health === 'low') lowCount++
    }

    return (
        <>
            <PageHeader title="Accounts" />
            <section className="px-4 pb-4 lg:px-0 space-y-4">
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start">
                    <div className="space-y-4 lg:order-2">
                        <AccountsHero
                            totalBalance={totalBalance}
                            savingsBalance={savingsBalance}
                            accountCount={accounts.length}
                            shares={shares}
                            runwayDays={runwayDays}
                            overdrawnCount={overdrawnCount}
                            lowCount={lowCount}
                            onAdd={() => setAddAccountDrawer(true)}
                        />
                        {!loading && accounts.length > 0 && <BalanceTrend points={trend} />}
                    </div>

                    <div className="lg:order-1">
                        {loading ? (
                            <LoadingContent />
                        ) : accounts.length === 0 ? (
                            <button
                                type="button"
                                onClick={() => setAddAccountDrawer(true)}
                                className="card w-full p-4 flex items-center gap-3 text-left hover:bg-surface-soft transition-colors"
                            >
                                <div className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', WALLET_TILE_CLASS)}>
                                    <WalletIcon className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-ink">No accounts yet</p>
                                    <p className="text-[11.5px] text-muted-ink mt-0.5">Tap to add your first bank or cash account</p>
                                </div>
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-1">
                                    Your accounts
                                </p>

                                <AccountList
                                    accounts={accounts}
                                    insights={insights}
                                    onOpen={setOpenAccount}
                                />
                            </div>
                        )}
                        {archived.length > 0 && (
                            <ArchivedAccounts accounts={archived} onRestore={handleRestoreAccount} />
                        )}
                    </div>
                </div>

                {/* Drawers */}
                <BottomDrawer open={addAccountDrawer} onClose={() => setAddAccountDrawer(false)} title="Add Account">
                    <AccountForm onSuccess={() => setAddAccountDrawer(false)} />
                </BottomDrawer>
                {/* Detail sheet — each action closes it and hands off to its own drawer */}
                <BottomDrawer open={!!openAccount} onClose={() => setOpenAccount(null)} title={openAccount?.name ?? ''}>
                    {openAccount && (
                        <AccountDetail
                            account={openAccount}
                            insight={insights.get(openAccount.id)}
                            canTransfer={accounts.length > 1}
                            hasActivePeriod={!!activePeriod}
                            onTransfer={() => { setEditTab('transfer'); setEditAccount(openAccount); setOpenAccount(null) }}
                            onEdit={() => { setEditTab('edit'); setEditAccount(openAccount); setOpenAccount(null) }}
                            onDelete={() => { setDeletingAccountId(openAccount.id); setOpenAccount(null) }}
                        />
                    )}
                </BottomDrawer>
                <BottomDrawer open={!!editAccount} onClose={() => setEditAccount(null)} title={editTab === 'transfer' ? 'Transfer' : 'Edit Account'}>
                    {editAccount &&
                        <AccountForm
                            key={`${editAccount.id}-${editTab}`}
                            initial={editAccount}
                            initialTab={editTab}
                            onSuccess={() => setEditAccount(null)}
                            allAccounts={accounts}
                        />}
                </BottomDrawer>

                <ConfirmDrawer
                    open={!!deletingAccountId}
                    title="Delete Account"
                    description="Delete this account? This cannot be undone. An account with transactions can be archived instead."
                    confirmLabel="Delete Account"
                    loading={deleteLoading}
                    onConfirm={handleDeleteAccount}
                    onClose={() => setDeletingAccountId(null)}
                />
                <ConfirmDrawer
                    open={!!archivingAccount}
                    title="Archive Account"
                    description={`${archivingAccount?.name ?? 'This account'} has transactions, so it can’t be deleted. Archive it instead? It disappears from your accounts and pickers, its transactions stay in your history, and you can restore it any time.`}
                    confirmLabel="Archive Account"
                    loading={archiveLoading}
                    onConfirm={handleArchiveAccount}
                    onClose={() => setArchivingAccount(null)}
                />
            </section>
        </>
    )
}
