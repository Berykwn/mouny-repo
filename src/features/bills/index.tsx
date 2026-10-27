import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LightbulbIcon from '~icons/ph/lightbulb-duotone'
import ReceiptIcon from '~icons/ph/receipt-duotone'
import { toast } from 'sonner'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { LoadingContent } from '@/components/loading-content'
import { useBills, usePeriods, usePeriodTransactions } from '@/queries'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { recurringBillsService } from '@/services/recurring-bills.service'
import { daysUntil, formatCurrency, formatShortCurrency, toISODate } from '@/lib/helpers'
import type { BillKind, RecurringBill } from '@/types'
import { Kpis, PillButton, PlanHeader, PlanRow, PlanSection, RowAmount } from '@/features/plan/components/layout'
import { SmartLine, type SmartAction } from '@/features/plan/components/smart-line'
import { billCosts, isRunning, nextDueDate, yearlyAhead, type BillDue } from './lib/bills'
import { lastPayment, subscriptionAudit } from './lib/bill-history'
import { dayDate, monthYear, relativeDays, scheduleLabel, setAsideText, shortDate } from './lib/bill-labels'
import { useBillHistory } from './hooks/use-bill-history'
import { BillDetail } from './components/bill-detail'
import { BillForm } from './components/bill-form'
import { BillTile } from './components/bill-tile'
import { PayBillForm } from './components/pay-bill-form'

const NO_BILLS: RecurringBill[] = []

const SUGGESTIONS = ['Rent', 'Electricity', 'Internet', 'Phone plan', 'Netflix', 'Spotify']

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))

export default function BillsPage() {
    const billsQuery = useBills()
    const bills = billsQuery.data ?? NO_BILLS
    const { activePeriod, isPending: periodsPending } = usePeriods()
    const txQuery = usePeriodTransactions(activePeriod?.id)
    const reserve = useBillReserve(activePeriod, txQuery.data)
    // The period's bills are only known once its transactions are in; until then nothing is shown as due or paid.
    const loading = billsQuery.isPending || periodsPending || (!!activePeriod && txQuery.isPending)
    const history = useBillHistory()
    const today = toISODate()

    const [adding, setAdding] = useState<string | null>(null)
    const [editing, setEditing] = useState<RecurringBill | null>(null)
    const [open, setOpen] = useState<RecurringBill | null>(null)
    const [paying, setPaying] = useState<BillDue | null>(null)
    const [deleting, setDeleting] = useState<RecurringBill | null>(null)
    const [busy, setBusy] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    // The command palette opens a bill through the navigation state, once the list has loaded.
    useEffect(() => {
        const billId = (location.state as { billId?: string } | null)?.billId
        if (!billId || !billsQuery.data) return
        const bill = billsQuery.data.find(b => b.id === billId)
        if (bill) setOpen(bill)
        navigate(location.pathname, { replace: true, state: null })
    }, [location.state, location.pathname, navigate, billsQuery.data])

    const costs = useMemo(() => billCosts(bills, today), [bills, today])
    const audit = useMemo(() => (history ? subscriptionAudit(bills, history, today) : null), [bills, history, today])

    const due = reserve.dues.filter(d => d.outstanding > 0)
    const paid = reserve.dues.filter(d => d.outstanding === 0)
    const paidTotal = reserve.dues.reduce((s, d) => s + d.paidAmount, 0)
    const rest = useMemo(() => {
        const inPeriod = new Set(reserve.dues.map(d => d.bill.id))
        const next = (b: RecurringBill) => (isRunning(b, today) ? nextDueDate(b, today) : null) ?? '9999'
        return bills
            .filter(b => !inPeriod.has(b.id))
            .sort((a, b) => Number(!isRunning(a, today)) - Number(!isRunning(b, today)) || next(a).localeCompare(next(b)) || a.name.localeCompare(b.name))
    }, [bills, reserve.dues, today])

    const dueFor = (bill: RecurringBill) => reserve.dues.find(d => d.bill.id === bill.id)
    // Yearly bills already in this period are on the list to pay, so the warning skips them.
    const nextYearly = useMemo(() => {
        const inPeriod = new Set(reserve.dues.map(d => d.bill.id))
        return yearlyAhead(bills.filter(b => !inPeriod.has(b.id)), today).find(a => a.monthsLeft > 1) ?? null
    }, [bills, reserve.dues, today])

    const togglePause = async (bill: RecurringBill) => {
        setBusy(true)
        const { error } = await recurringBillsService.update(bill.id, { paused: !bill.paused })
        setBusy(false)
        if (error) { toast.error(error); return }
        toast.success(bill.paused ? `${bill.name} resumed.` : `${bill.name} paused.`)
        setOpen(null)
    }

    const updateAmount = async (bill: RecurringBill, amount: number) => {
        setBusy(true)
        const { error } = await recurringBillsService.update(bill.id, { amount })
        setBusy(false)
        if (error) { toast.error(error); return }
        toast.success(`${bill.name} is now ${formatCurrency(amount)}.`)
    }

    const handleDelete = async () => {
        if (!deleting) return
        setBusy(true)
        const { error } = await recurringBillsService.remove(deleting.id)
        setBusy(false)
        if (error) { toast.error(error); return }
        toast.success(`${deleting.name} deleted.`)
        setDeleting(null)
    }

    // The one smart line: a subscription that went up, or one left paused, only from real payments.
    // Without either, the next yearly bill outside this period and what a month needs to cover it.
    let smart: { text: ReactNode; actions: SmartAction[] } | null = null
    if (audit) {
        const { rise, paused } = audit
        const actions: SmartAction[] = []
        // The audit drops a rise once the bill is at the new price, so this is always still to do.
        if (rise) actions.push({ label: `Update ${rise.bill.name} to ${formatShortCurrency(rise.change.to)}`, onClick: () => updateAmount(rise.bill, rise.change.to), disabled: busy })
        if (paused[0]) actions.push({ label: `Review ${paused[0].bill.name}`, onClick: () => setOpen(paused[0].bill) })
        smart = {
            text: (
                <>
                    Subscriptions cost <b>{formatShortCurrency(audit.perYear)} a year</b>.
                    {rise && <> {rise.bill.name} went up {rise.change.percent}% at its last payment.</>}
                    {paused.length > 0 && (
                        <> {paused[0].bill.name} is paused{paused[0].lastPaid ? `, last paid ${shortDate(paused[0].lastPaid)}` : ''}
                            {paused.length > 1 ? ` (and ${paused.length - 1} more)` : ''}.</>
                    )}
                </>
            ),
            actions,
        }
    } else if (history && nextYearly) {
        smart = {
            text: setAsideText(nextYearly, today, true),
            actions: [{ label: 'Review bill', onClick: () => setOpen(nextYearly.bill) }],
        }
    }

    const dueRow = (d: BillDue) => {
        const days = daysUntil(d.nextDue!)
        return (
            <PlanRow
                key={d.bill.id}
                lead={<BillTile bill={d.bill} />}
                title={d.bill.name}
                sub={`${dayDate(d.nextDue!)} · ${relativeDays(days)}${d.outstanding > 1 ? ` · ${d.outstanding} due` : ''}`}
                subClassName={days < 0 ? 'text-negative' : undefined}
                onOpen={() => setOpen(d.bill)}
                end={<PillButton onClick={() => setPaying(d)}>Pay {formatShortCurrency(d.bill.amount)}</PillButton>}
            />
        )
    }

    return (
        <>
            <PlanHeader title="Bills" add={{ label: 'Add bill', onClick: () => setAdding('') }} />
            <section className="px-4 pb-4 lg:px-0 space-y-6 lg:max-w-3xl">
                {loading ? <LoadingContent /> : bills.length === 0 ? (
                    <div className="card p-5">
                        <span className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-brand-tint text-brand-ink">
                            <ReceiptIcon className="w-[22px] h-[22px]" />
                        </span>
                        <p className="mt-3 text-[14px] font-medium text-ink">No bills yet</p>
                        <p className="mt-0.5 text-[12px] text-muted-ink leading-relaxed">
                            Add what you pay every month or year, and safe to spend holds back what’s still due.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {SUGGESTIONS.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setAdding(s)}
                                    className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-line bg-surface text-ink hover:bg-surface-hover transition-colors"
                                >
                                    + {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <div>
                            <Kpis className="lg:hidden" items={[
                                { label: 'Per month', value: plain(costs.perMonth) },
                                { label: 'Per year', value: plain(costs.perYear) },
                            ]} />
                            <Kpis className="hidden lg:grid" items={[
                                { label: 'Per month', value: plain(costs.perMonth) },
                                { label: 'Per year', value: plain(costs.perYear) },
                                { label: 'Due now', value: plain(reserve.reserved) },
                                { label: 'Paid this period', value: plain(paidTotal) },
                            ]} />
                        </div>

                        {smart && <SmartLine icon={LightbulbIcon} actions={smart.actions}>{smart.text}</SmartLine>}

                        {due.length > 0 && (
                            <PlanSection title="Due this period" meta={due.length}>{due.map(dueRow)}</PlanSection>
                        )}

                        {paid.length > 0 && (
                            <PlanSection title="Paid this period" meta={paid.length}>
                                {paid.map(d => {
                                    const last = d.payments.reduce<typeof d.payments[number] | null>((m, t) => (!m || t.date > m.date ? t : m), null)
                                    return (
                                        <PlanRow
                                            key={d.bill.id}
                                            lead={<BillTile bill={d.bill} />}
                                            title={d.bill.name}
                                            sub={last ? [`Paid ${shortDate(last.date.slice(0, 10))}`, last.account?.name].filter(Boolean).join(' · ') : 'Paid'}
                                            onOpen={() => setOpen(d.bill)}
                                            end={<RowAmount>{plain(d.paidAmount)}</RowAmount>}
                                        />
                                    )
                                })}
                            </PlanSection>
                        )}

                        {rest.length > 0 && (
                            <PlanSection
                                title={reserve.window ? 'Not due this period' : 'All bills'}
                                meta={reserve.window ? undefined : 'Open a pay period to pay bills.'}
                            >
                                {rest.map(bill => {
                                    const running = isRunning(bill, today)
                                    const next = running ? nextDueDate(bill, today) : null
                                    const lastPaid = lastPayment(history?.get(bill.id))
                                    const sub = bill.paused
                                        ? `Paused${lastPaid ? ` · last paid ${shortDate(lastPaid.date)}` : ''}`
                                        : !next ? 'Ended'
                                            : bill.frequency === 'yearly' ? `Yearly · next ${monthYear(next)}` : `${scheduleLabel(bill)} · next ${dayDate(next)}`
                                    return (
                                        <PlanRow
                                            key={bill.id}
                                            lead={<BillTile bill={bill} />}
                                            title={bill.name}
                                            sub={sub}
                                            onOpen={() => setOpen(bill)}
                                            end={<RowAmount muted={!running} sub={bill.frequency === 'yearly' ? '/year' : '/month'}>{plain(bill.amount)}</RowAmount>}
                                        />
                                    )
                                })}
                            </PlanSection>
                        )}
                    </>
                )}

                <BottomDrawer open={adding !== null} onClose={() => setAdding(null)} title="Add bill">
                    {adding !== null && (
                        <BillForm
                            key={adding}
                            preset={adding ? suggestion(adding) : undefined}
                            onSuccess={() => setAdding(null)}
                        />
                    )}
                </BottomDrawer>

                <BottomDrawer open={!!editing} onClose={() => setEditing(null)} title="Edit bill">
                    {editing && <BillForm key={editing.id} initial={editing} onSuccess={() => setEditing(null)} />}
                </BottomDrawer>

                {/* Detail sheet — each action closes it and hands off to its own drawer */}
                <BottomDrawer open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''}>
                    {open && (
                        <BillDetail
                            bill={open}
                            due={activePeriod ? dueFor(open) : undefined}
                            nextDue={(activePeriod ? dueFor(open)?.nextDue : null) ?? nextDueDate(open, today)}
                            payments={history ? history.get(open.id) ?? [] : null}
                            busy={busy}
                            onPay={() => { const d = dueFor(open); if (d) setPaying(d); setOpen(null) }}
                            onTogglePause={() => togglePause(open)}
                            onEdit={() => { setEditing(open); setOpen(null) }}
                            onDelete={() => { setDeleting(open); setOpen(null) }}
                        />
                    )}
                </BottomDrawer>

                <BottomDrawer open={!!paying} onClose={() => setPaying(null)} title={paying ? `Pay ${paying.bill.name}` : ''}>
                    {paying && activePeriod && (
                        <PayBillForm
                            key={paying.bill.id}
                            bill={paying.bill}
                            nextDue={paying.nextDue}
                            payPeriodId={activePeriod.id}
                            periodStart={activePeriod.start_date}
                            lastPaid={lastPayment(history?.get(paying.bill.id))}
                            onSuccess={() => setPaying(null)}
                        />
                    )}
                </BottomDrawer>

                <ConfirmDrawer
                    open={!!deleting}
                    title="Delete bill"
                    description="Past payments stay in your history as ordinary expenses."
                    confirmLabel="Delete"
                    loading={busy}
                    onConfirm={handleDelete}
                    onClose={() => setDeleting(null)}
                />
            </section>
        </>
    )
}

function suggestion(name: string): { name: string; kind: BillKind } {
    return { name, kind: /netflix|spotify/i.test(name) ? 'subscription' : 'bill' }
}
