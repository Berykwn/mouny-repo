import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Plus, Wallet } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { EmptyState, EMPTY_STATE_BUTTON } from '@/components/empty-state'
import { RetryInline } from '@/components/retry-inline'
import { SmartLine } from '@/components/smart-line'
import { AccountForm } from './components/account-form'
import { AccountList } from './components/account-list'
import { BalanceTrend } from './components/balance-trend'
import { AccountDetail } from './components/account-detail'
import { accountInsights, balanceTrend, daysIntoPeriod, runOutFirst } from './lib/account-insights'
import { accountsService } from '@/services/accounts-categories.service'
import { IN_USE_MESSAGE } from '@/services/_base'
import { useAccounts, useArchivedAccounts, usePeriods, usePeriodTransactions } from '@/queries'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import type { Account, TransactionWithDetails } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { addDaysISO, periodProgress } from '@/features/periods/lib/period-progress'
import { formatCurrency, formatShortCurrency, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { ArchivedAccounts } from './components/archived-accounts'
import { PageHeader } from '@/components/page-header'

const NO_ACCOUNTS: Account[] = []
const NO_TXS: TransactionWithDetails[] = []

interface EditTarget {
    account: Account
    tab: 'edit' | 'transfer'
    toAccountId?: string
    amount?: number
}

/** "Thursday" within the week, "3 Nov" after it. */
function dayName(date: string): string {
    const d = new Date(date + 'T00:00:00')
    const inAWeek = date <= addDaysISO(toISODate(), 6)
    return inAWeek
        ? d.toLocaleDateString('en-GB', { weekday: 'long' })
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function AccountPage() {
    const accountsQuery = useAccounts()
    const accounts = accountsQuery.data ?? NO_ACCOUNTS
    const loading = accountsQuery.isPending
    // Activity, runway and trend are extras: the list still works if these fail.
    const { periods, activePeriod } = usePeriods()
    const { data: periodTxs = NO_TXS } = usePeriodTransactions(activePeriod?.id)
    const [edit, setEdit] = useState<EditTarget | null>(null)
    const [addAccountDrawer, setAddAccountDrawer] = useState(false)
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [openAccount, setOpenAccount] = useState<Account | null>(null)
    const [archivingAccount, setArchivingAccount] = useState<Account | null>(null)
    const [archiveLoading, setArchiveLoading] = useState(false)
    const [warningDismissed, setWarningDismissed] = useState<string | null>(null)
    const { data: archived = NO_ACCOUNTS } = useArchivedAccounts()
    const location = useLocation()
    const navigate = useNavigate()
    const topBarSlot = useTopBarSlotNode()

    // The command palette asks for the add sheet through the navigation state.
    useEffect(() => {
        const state = location.state as { add?: boolean } | null
        if (!state) return
        if (state.add) setAddAccountDrawer(true)
        navigate(location.pathname, { replace: true, state: null })
    }, [location.state, location.pathname, navigate])

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
    const trend = useMemo(() => balanceTrend(periods, totalBalance), [periods, totalBalance])
    const daysToPayday = activePeriod ? periodProgress(activePeriod, periods).daysToPayday : null
    const warning = activePeriod ? runOutFirst(accounts, insights, daysElapsed, daysToPayday) : null
    const overdrawn = accounts.find(a => a.balance < 0 && !a.is_savings) ?? null
    // The fullest spendable account, where a transfer starts when nothing more specific is known.
    const fullest = [...accounts].filter(a => a.balance > 0).sort((a, b) => Number(a.is_savings) - Number(b.is_savings) || b.balance - a.balance)[0] ?? null

    const openTransfer = (from: Account | null, to?: Account, amount?: number) => {
        if (!from) return
        setEdit({ account: from, tab: 'transfer', toAccountId: to?.id, amount })
    }

    // At most one smart line: an overdrawn account first, then the one running out first.
    let smart: ReactNode = null
    if (overdrawn && overdrawn.id !== warningDismissed) {
        const source = accounts.filter(a => a.id !== overdrawn.id && a.balance > 0).sort((a, b) => b.balance - a.balance)[0] ?? null
        smart = (
            <SmartLine actions={[
                ...(source ? [{ label: `Move money from ${source.name}`, onClick: () => openTransfer(source, overdrawn) }] : []),
                { label: 'Not now', onClick: () => setWarningDismissed(overdrawn.id) },
            ]}>
                <b>{overdrawn.name}</b> is {formatCurrency(-overdrawn.balance)} below zero.
            </SmartLine>
        )
    } else if (warning && warning.account.id !== warningDismissed) {
        const runsOut = dayName(addDaysISO(toISODate(), warning.runwayDays))
        smart = (
            <SmartLine actions={[
                ...(warning.source ? [{
                    label: warning.topUp ? `Top up ${formatShortCurrency(warning.topUp)}` : 'Transfer',
                    onClick: () => openTransfer(warning.source, warning.account, warning.topUp ?? undefined),
                }] : []),
                { label: 'Not now', onClick: () => setWarningDismissed(warning.account.id) },
            ]}>
                {warning.account.name} runs out around <b>{runsOut}</b> at how you use it ({formatCurrency(Math.round(warning.dailyOut))} a day).
            </SmartLine>
        )
    }

    const topBar = topBarSlot && createPortal(
        <>
            {accounts.length > 1 && (
                <button
                    type="button"
                    onClick={() => openTransfer(fullest)}
                    className="h-9 px-3.5 rounded-[10px] border border-line text-[13px] font-semibold text-ink hover:bg-surface-hover transition-colors flex items-center gap-1.5"
                >
                    <ArrowLeftRight className="w-4 h-4" /> Transfer
                </button>
            )}
            <button
                type="button"
                onClick={() => setAddAccountDrawer(true)}
                aria-label="Add account"
                title="Add account"
                className="h-9 w-9 rounded-[10px] border border-line text-ink hover:bg-surface-hover transition-colors flex items-center justify-center"
            >
                <Plus className="w-4 h-4" />
            </button>
        </>,
        topBarSlot,
    )

    return (
        <>
            <PageHeader
                title="Accounts"
                back="/"
                action={
                    <button
                        type="button"
                        onClick={() => setAddAccountDrawer(true)}
                        aria-label="Add account"
                        className="w-10 h-10 rounded-[12px] border border-line flex items-center justify-center text-ink hover:bg-surface-hover transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                }
            />
            {topBar}
            <section className="px-4 pb-6 lg:px-0 space-y-6 lg:max-w-[900px]">
                {loading ? (
                    <LoadingContent />
                ) : accountsQuery.error && accounts.length === 0 ? (
                    <RetryInline what="Your accounts" onRetry={() => void accountsQuery.refetch()} retrying={accountsQuery.isRefetching} />
                ) : accounts.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        title="Where does your money sit?"
                        action={<button type="button" onClick={() => setAddAccountDrawer(true)} className={EMPTY_STATE_BUTTON}>Add an account</button>}
                    >
                        Add your bank, e-wallet and cash, with what’s in each today.
                    </EmptyState>
                ) : (
                    <>
                        <header className="pt-1">
                            <p className="text-[14px] text-subtle-ink">Total balance</p>
                            <p className={cn(
                                'mt-1 text-[38px] lg:text-[44px] font-semibold tracking-[-0.025em] leading-[1.05] tabular-nums',
                                totalBalance < 0 ? 'text-negative' : 'text-ink'
                            )}>
                                {formatCurrency(totalBalance)}
                            </p>
                            <p className="mt-1.5 text-[15px] text-muted-ink">
                                {savingsBalance !== 0 ? (
                                    <><b className="font-semibold text-ink">{formatCurrency(totalBalance - savingsBalance)}</b> spendable · {formatCurrency(savingsBalance)} in savings</>
                                ) : `Across ${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
                            </p>
                        </header>

                        {smart}

                        <AccountList accounts={accounts} insights={insights} onOpen={setOpenAccount} />

                        {trend.length >= 2 && <div className="lg:max-w-[440px]"><BalanceTrend points={trend} /></div>}
                    </>
                )}
                {archived.length > 0 && (
                    <ArchivedAccounts accounts={archived} onRestore={handleRestoreAccount} />
                )}

                {/* Drawers */}
                <BottomDrawer open={addAccountDrawer} onClose={() => setAddAccountDrawer(false)} title="Add account">
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
                            onTransfer={() => { openTransfer(openAccount); setOpenAccount(null) }}
                            onAdjust={() => { setEdit({ account: openAccount, tab: 'edit' }); setOpenAccount(null) }}
                            onEdit={() => { setEdit({ account: openAccount, tab: 'edit' }); setOpenAccount(null) }}
                            onDelete={() => { setDeletingAccountId(openAccount.id); setOpenAccount(null) }}
                        />
                    )}
                </BottomDrawer>
                <BottomDrawer open={!!edit} onClose={() => setEdit(null)} title={edit?.tab === 'transfer' ? 'Transfer' : 'Edit account'}>
                    {edit &&
                        <AccountForm
                            key={`${edit.account.id}-${edit.tab}-${edit.toAccountId ?? ''}`}
                            initial={edit.account}
                            initialTab={edit.tab}
                            initialToAccountId={edit.toAccountId}
                            initialAmount={edit.amount}
                            onSuccess={() => setEdit(null)}
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
