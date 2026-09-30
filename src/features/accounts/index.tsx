import { useEffect, useState, useCallback, useMemo } from 'react'
import { WalletIcon, WALLET_TILE_CLASS } from '@/components/account-type-icon'
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
import { payPeriodsService } from '@/services/pay-periods.service'
import { transactionsService } from '@/services/transactions.service'
import type { Account, PayPeriod, TransactionWithDetails } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'

export function AccountPage() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [editAccount, setEditAccount] = useState<Account | null>(null)
    const [addAccountDrawer, setAddAccountDrawer] = useState(false)
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [openAccount, setOpenAccount] = useState<Account | null>(null)
    const [editTab, setEditTab] = useState<'edit' | 'transfer'>('edit')
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [periods, setPeriods] = useState<PayPeriod[]>([])
    const [periodTxs, setPeriodTxs] = useState<TransactionWithDetails[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        const [{ data: accs, error }, { data: active }, { data: allPeriods }] = await Promise.all([
            accountsService.getAll(),
            payPeriodsService.getActive(),
            payPeriodsService.getAll(),
        ])
        if (error) toast.error(error)
        setAccounts(accs ?? [])
        // Activity, runway and trend are extras: the list still works if these fail.
        setActivePeriod(active ?? null)
        setPeriods(allPeriods ?? [])
        if (active) {
            const { data: txs } = await transactionsService.getByPeriod(active.id)
            setPeriodTxs(txs ?? [])
        } else {
            setPeriodTxs([])
        }
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

    const daysElapsed = daysIntoPeriod(activePeriod)
    const insights = useMemo(() => accountInsights(accounts, periodTxs, daysElapsed), [accounts, periodTxs, daysElapsed])
    const shares = useMemo(() => accountShares(accounts), [accounts])
    const trend = useMemo(() => balanceTrend(periods, totalBalance), [periods, totalBalance])
    const runwayDays = totalRunwayDays(totalBalance, periodTxs, daysElapsed)
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
                    </div>
                </div>

                {/* Drawers */}
                <BottomDrawer open={addAccountDrawer} onClose={() => setAddAccountDrawer(false)} title="Add Account">
                    <AccountForm onSuccess={() => { setAddAccountDrawer(false); load() }} />
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
        </>
    )
}
