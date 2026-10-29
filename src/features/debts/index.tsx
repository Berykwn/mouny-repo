import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LightbulbIcon from '~icons/ph/lightbulb-duotone'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { DebtForm } from './components/debt-form'
import { DebtDetail } from './components/debt-detail'
import { DebtEmpty } from './components/debt-empty'
import { DebtSettled } from './components/debt-settled'
import { OweRow, OwedRow } from './components/debt-cards'
import { EditDebtForm } from './components/edit-debt-form'
import { PayDebtForm } from './components/pay-debt-form'
import { PayReceivableForm } from './components/pay-receivable-form'
import { fasterPayoff, payoffPlan, sortByUrgency, summarize } from './lib/debt-insights'
import { sendReminder } from './lib/reminder'
import { usePaidThisPeriod } from './hooks/use-paid-this-period'
import { debtsService } from '@/services/debts.service'
import { useDebts, usePeriods, useSavingsPace } from '@/queries'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import type { DebtType, DebtWithAccount } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { monthYear } from '@/features/bills/lib/bill-labels'
import { Kpis, PlanHeader, PlanSection } from '@/features/plan/components/layout'
import { SmartLine } from '@/features/plan/components/smart-line'

const NO_DEBTS: DebtWithAccount[] = []

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))

export default function DebtsPage() {
    const debtsQuery = useDebts()
    const debts = debtsQuery.data ?? NO_DEBTS
    const loading = debtsQuery.isPending
    const { activePeriod } = usePeriods()
    const periodId = activePeriod?.id ?? null
    const periodStartDate = activePeriod?.start_date ?? null
    // The payoff pace is an extra — the same leftover-per-period the wish list plans with.
    const pace = useSavingsPace()
    const [addType, setAddType] = useState<DebtType | null>(null)
    const [openDebt, setOpenDebt] = useState<DebtWithAccount | null>(null)
    const [editingDebt, setEditingDebt] = useState<DebtWithAccount | null>(null)
    const [payingDebt, setPayingDebt] = useState<DebtWithAccount | null>(null)
    const [collectingDebt, setCollectingDebt] = useState<DebtWithAccount | null>(null)
    const [deletingDebt, setDeletingDebt] = useState<DebtWithAccount | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    // The command palette opens a debt through the navigation state, once the list has loaded.
    useEffect(() => {
        const debtId = (location.state as { debtId?: string } | null)?.debtId
        if (!debtId || !debtsQuery.data) return
        const debt = debtsQuery.data.find(d => d.id === debtId)
        if (debt) setOpenDebt(debt)
        navigate(location.pathname, { replace: true, state: null })
    }, [location.state, location.pathname, navigate, debtsQuery.data])

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
    const paidThisPeriod = usePaidThisPeriod(active, periodStartDate)
    const plan = useMemo(() => payoffPlan(active, pace, undefined, paidThisPeriod), [active, pace, paidThisPeriod])
    const faster = useMemo(() => fasterPayoff(active, pace), [active, pace])
    const stopFor = (debt: DebtWithAccount) => plan.stops.find(s => s.debt.id === debt.id)
    // Cards follow the payoff order, so the first one is where extra money goes.
    const myDebts = useMemo(() => {
        const order = new Map(plan.stops.map((s, i) => [s.debt.id, i]))
        return active.filter(d => d.type === 'debt').sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
    }, [active, plan])
    const receivables = useMemo(() => sortByUrgency(active.filter(d => d.type === 'receivable')), [active])
    const canAdd = !!periodId && !!periodStartDate
    const firstStop = plan.stops[0]
    const debtFree = plan.debtFreeDate ? monthYear(plan.debtFreeDate) : null

    const empty = (text: string) => <p className="px-1 py-2.5 text-[13px] text-muted-ink">{text}</p>

    // The one smart line: what a period sooner takes, from the usual leftover; never a guess.
    const smart = faster && firstStop && pace ? (
        <SmartLine
            icon={LightbulbIcon}
            actions={[{ label: `Pay ${firstStop.debt.counterparty}`, onClick: () => setPayingDebt(firstStop.debt), disabled: !canAdd }]}
        >
            Debt-free by <b>{monthYear(faster.current)}</b> if your usual {formatShortCurrency(Math.round(pace.perPeriod))} left over goes to debts.
            {' '}Put <b>{formatCurrency(faster.extraPerPeriod)}</b> more toward them each period and it’s <b>{monthYear(faster.sooner)}</b>.
        </SmartLine>
    ) : null

    return (
        <>
            <PlanHeader title="Debts" add={{ label: 'Add debt', onClick: () => setAddType('debt'), disabled: !canAdd }} />
            <section className="px-4 pb-4 lg:px-0 space-y-6 lg:max-w-3xl">
                {loading ? <LoadingContent /> : active.length === 0 ? (
                    <>
                        <DebtEmpty onAdd={setAddType} disabled={!canAdd} />
                        <DebtSettled debts={settled} onOpen={setOpenDebt} />
                    </>
                ) : (
                    <>
                        <div>
                            <Kpis className="lg:hidden" items={[
                                { label: 'You owe', value: plain(summary.owed) },
                                { label: 'Owed to you', value: plain(summary.receivable), valueClassName: 'text-brand-ink' },
                            ]} />
                            <Kpis className="hidden lg:grid" items={[
                                { label: 'You owe', value: plain(summary.owed) },
                                { label: 'Owed to you', value: plain(summary.receivable), valueClassName: 'text-brand-ink' },
                                {
                                    label: 'Debt-free by',
                                    value: summary.owed === 0 ? 'Now' : debtFree ?? '—',
                                    sub: summary.owed > 0 && !debtFree ? 'estimated after a closed period' : undefined,
                                },
                            ]} />
                        </div>

                        {smart}

                        {/* The two sides one after the other, like Bills' due and paid. */}
                        <PlanSection title="You owe" meta={myDebts.length > 0 ? formatShortCurrency(summary.owed) : undefined}>
                            {myDebts.length === 0 ? empty('You owe nobody.') : myDebts.map(d => (
                                <OweRow
                                    key={d.id}
                                    debt={d}
                                    stop={stopFor(d)}
                                    canPay={canAdd}
                                    onOpen={() => setOpenDebt(d)}
                                    onPay={() => setPayingDebt(d)}
                                />
                            ))}
                        </PlanSection>

                        <PlanSection title="Owed to you" meta={receivables.length > 0 ? formatShortCurrency(summary.receivable) : undefined}>
                            {receivables.length === 0 ? empty('Nobody owes you anything.') : receivables.map(d => (
                                <OwedRow
                                    key={d.id}
                                    debt={d}
                                    canCollect={canAdd}
                                    onOpen={() => setOpenDebt(d)}
                                    onRemind={() => sendReminder(d)}
                                    onCollect={() => setCollectingDebt(d)}
                                />
                            ))}
                        </PlanSection>

                        <DebtSettled debts={settled} onOpen={setOpenDebt} />
                    </>
                )}

                <BottomDrawer
                    open={!!addType}
                    onClose={() => setAddType(null)}
                    title="Add debt"
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
                    title="Edit debt"
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
                    title="Record payment"
                >
                    {payingDebt && periodId && periodStartDate && (
                        <PayDebtForm
                            debt={payingDebt}
                            plannedAmount={stopFor(payingDebt)?.thisPeriodDue}
                            payPeriodId={periodId}
                            periodStartDate={periodStartDate}
                            onSuccess={() => setPayingDebt(null)}
                        />
                    )}
                </BottomDrawer>

                <BottomDrawer
                    open={!!collectingDebt}
                    onClose={() => setCollectingDebt(null)}
                    title="Record collection"
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
                    title="Delete debt"
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
