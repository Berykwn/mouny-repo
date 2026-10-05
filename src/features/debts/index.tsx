import { useState, useMemo } from 'react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { DebtList } from './components/debt-list'
import { DebtForm } from './components/debt-form'
import { DebtsHero } from './components/debts-hero'
import { DebtDetail } from './components/debt-detail'
import { DebtEmpty } from './components/debt-empty'
import { DebtSettled } from './components/debt-settled'
import { DebtPlan } from './components/debt-plan'
import { DebtUpcoming } from './components/debt-upcoming'
import { EditDebtForm } from './components/edit-debt-form'
import { PayDebtForm } from './components/pay-debt-form'
import { PayReceivableForm } from './components/pay-receivable-form'
import { payoffPlan, summarize, upcoming } from './lib/debt-insights'
import { debtsService } from '@/services/debts.service'
import { useAccounts, useDebts, usePeriods, useSavingsPace } from '@/queries'
import { formatCurrency } from '@/lib/helpers'
import type { DebtType, DebtWithAccount } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { PageHeader } from '@/components/page-header'

const NO_DEBTS: DebtWithAccount[] = []

export default function DebtsPage() {
    const debtsQuery = useDebts()
    const debts = debtsQuery.data ?? NO_DEBTS
    const loading = debtsQuery.isPending
    const { activePeriod } = usePeriods()
    const periodId = activePeriod?.id ?? null
    const periodStartDate = activePeriod?.start_date ?? null
    // Coverage is an extra: the page still works without account balances.
    const { data: accounts } = useAccounts()
    const totalBalance = accounts ? accounts.reduce((s, a) => s + a.balance, 0) : null
    // So is the payoff pace — the same leftover-per-period the wish list plans with.
    const pace = useSavingsPace()
    const [addType, setAddType] = useState<DebtType | null>(null)
    const [openDebt, setOpenDebt] = useState<DebtWithAccount | null>(null)
    const [editingDebt, setEditingDebt] = useState<DebtWithAccount | null>(null)
    const [payingDebt, setPayingDebt] = useState<DebtWithAccount | null>(null)
    const [collectingDebt, setCollectingDebt] = useState<DebtWithAccount | null>(null)
    const [deletingDebt, setDeletingDebt] = useState<DebtWithAccount | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const handleDeleteConfirm = async () => {
        if (!deletingDebt) return
        setDeleteLoading(true)
        const { error } = await debtsService.remove(deletingDebt.id)
        setDeleteLoading(false)
        if (error) { toast.error(error); return }
        setDeletingDebt(null)
        toast.success('Debt record deleted.')
    }

    const deleteDescription = (() => {
        if (!deletingDebt) return ''
        const paidAmount = deletingDebt.total_amount - deletingDebt.remaining_amount
        const isFullyPaid = deletingDebt.remaining_amount === 0
        const isUnpaid = paidAmount === 0
        if (isFullyPaid) return 'This debt is fully paid. Deleting will remove the record only — past transactions are unaffected.'
        if (isUnpaid) return 'This debt has no payments recorded yet. The record will be permanently removed.'
        return `${formatCurrency(paidAmount)} of this debt has already been recorded as paid. Deleting will remove the debt record, but those transactions will remain in your history.`
    })()

    const active = useMemo(() => debts.filter(d => d.status === 'active'), [debts])
    const settled = useMemo(
        () => debts
            .filter(d => d.status !== 'active')
            .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
        [debts]
    )
    const summary = useMemo(() => summarize(active), [active])
    const plan = useMemo(() => payoffPlan(active, pace), [active, pace])
    const comingUp = useMemo(() => upcoming(active), [active])
    const stopFor = (debt: DebtWithAccount) => plan.stops.find(s => s.debt.id === debt.id)
    const myDebts = active.filter(d => d.type === 'debt')
    const receivables = active.filter(d => d.type === 'receivable')
    const canAdd = !!periodId && !!periodStartDate

    const hero = (
        <DebtsHero
            summary={summary}
            totalBalance={totalBalance}
            canAdd={canAdd}
            onAdd={() => setAddType('debt')}
        />
    )
    const settledCard = <DebtSettled debts={settled} onOpen={setOpenDebt} />
    const planCard = <DebtPlan plan={plan} pace={pace} onOpen={setOpenDebt} />

    return (
        <>
            <PageHeader title="Debts" />
            <section className="px-4 pb-4 lg:px-0 space-y-4">
                {loading ? <LoadingContent /> : (
                    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start lg:space-y-0">
                        <div className="space-y-4 lg:order-2">
                            {hero}
                            <div className="hidden lg:block space-y-4">{planCard}{settledCard}</div>
                        </div>

                        <div className="space-y-4 lg:order-1">
                            {active.length === 0 ? (
                                <DebtEmpty onAdd={setAddType} disabled={!canAdd} />
                            ) : (
                                <>
                                    <DebtUpcoming debts={comingUp} onOpen={setOpenDebt} />
                                    <DebtList title="You owe" debts={myDebts} onOpen={setOpenDebt} />
                                    <DebtList title="Owed to you" debts={receivables} onOpen={setOpenDebt} />
                                </>
                            )}
                            <div className="lg:hidden space-y-4">{planCard}{settledCard}</div>
                        </div>
                    </div>
                )}

                <BottomDrawer
                    open={!!addType}
                    onClose={() => setAddType(null)}
                    title="Add Debt"
                >
                    {/* Keyed so each open starts fresh on the chosen side. */}
                    {addType && periodId && periodStartDate && (
                        <DebtForm
                            key={addType}
                            initialType={addType}
                            payPeriodId={periodId}
                            periodStartDate={periodStartDate}
                            onSuccess={() => setAddType(null)}
                        />
                    )}
                </BottomDrawer>

                {/* Detail sheet — each action closes it and hands off to its own drawer */}
                <BottomDrawer
                    open={!!openDebt}
                    onClose={() => setOpenDebt(null)}
                    title={openDebt?.counterparty ?? ''}
                >
                    {openDebt && (
                        <DebtDetail
                            debt={openDebt}
                            stop={stopFor(openDebt)}
                            hasActivePeriod={canAdd}
                            onSettle={() => {
                                if (openDebt.type === 'debt') setPayingDebt(openDebt)
                                else setCollectingDebt(openDebt)
                                setOpenDebt(null)
                            }}
                            onEdit={() => { setEditingDebt(openDebt); setOpenDebt(null) }}
                            onDelete={() => { setDeletingDebt(openDebt); setOpenDebt(null) }}
                        />
                    )}
                </BottomDrawer>

                <BottomDrawer
                    open={!!editingDebt}
                    onClose={() => setEditingDebt(null)}
                    title="Edit Debt"
                >
                    {editingDebt && (
                        <EditDebtForm
                            key={editingDebt.id}
                            debt={editingDebt}
                            onSuccess={() => setEditingDebt(null)}
                        />
                    )}
                </BottomDrawer>

                <BottomDrawer
                    open={!!payingDebt}
                    onClose={() => setPayingDebt(null)}
                    title="Record Payment"
                >
                    {payingDebt && periodId && periodStartDate && (
                        <PayDebtForm
                            debt={payingDebt}
                            plannedAmount={stopFor(payingDebt)?.perPeriodNeeded}
                            payPeriodId={periodId}
                            periodStartDate={periodStartDate}
                            onSuccess={() => setPayingDebt(null)}
                        />
                    )}
                </BottomDrawer>

                <BottomDrawer
                    open={!!collectingDebt}
                    onClose={() => setCollectingDebt(null)}
                    title="Record Collection"
                >
                    {collectingDebt && periodId && periodStartDate && (
                        <PayReceivableForm
                            debt={collectingDebt}
                            payPeriodId={periodId}
                            periodStartDate={periodStartDate}
                            onSuccess={() => setCollectingDebt(null)}
                        />
                    )}
                </BottomDrawer>

                <ConfirmDrawer
                    open={!!deletingDebt}
                    title="Delete Debt"
                    description={deleteDescription}
                    confirmLabel="Delete"
                    loading={deleteLoading}
                    onConfirm={handleDeleteConfirm}
                    onClose={() => setDeletingDebt(null)}
                />
            </section>
        </>
    )
}
