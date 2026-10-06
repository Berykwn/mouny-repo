import { useMemo, useState } from 'react'
import { Pause, Pencil, Play, Plus, Receipt, Repeat, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { LoadingContent } from '@/components/loading-content'
import { PageHeader } from '@/components/page-header'
import { HeroGlow } from '@/components/hero'
import { useBills, usePeriods, usePeriodTransactions } from '@/queries'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { recurringBillsService } from '@/services/recurring-bills.service'
import { formatCurrency, formatShortCurrency, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { BillKind, RecurringBill } from '@/types'
import { billCosts, isRunning, nextDueDate, type BillDue } from './lib/bills'
import { scheduleLabel, shortDate } from './lib/bill-labels'
import { BillDueRow } from './components/bill-due-row'
import { BillForm } from './components/bill-form'
import { PayBillForm } from './components/pay-bill-form'

const NO_BILLS: RecurringBill[] = []

const SUGGESTIONS = ['Rent', 'Electricity', 'Internet', 'Phone plan', 'Netflix', 'Spotify']

export default function BillsPage() {
    const billsQuery = useBills()
    const bills = billsQuery.data ?? NO_BILLS
    const { activePeriod } = usePeriods()
    const { data: periodTxs } = usePeriodTransactions(activePeriod?.id)
    const reserve = useBillReserve(activePeriod, periodTxs)
    const today = toISODate()

    const [adding, setAdding] = useState<string | null>(null)
    const [editing, setEditing] = useState<RecurringBill | null>(null)
    const [open, setOpen] = useState<RecurringBill | null>(null)
    const [paying, setPaying] = useState<BillDue | null>(null)
    const [deleting, setDeleting] = useState<RecurringBill | null>(null)
    const [busy, setBusy] = useState(false)

    const costs = useMemo(() => billCosts(bills, today), [bills, today])
    const groups = useMemo(() => {
        const byNext = (a: RecurringBill, b: RecurringBill) =>
            (nextDueDate(a, today) ?? '9999').localeCompare(nextDueDate(b, today) ?? '9999')
        const running = bills.filter(b => isRunning(b, today))
        return [
            { title: 'Bills', bills: running.filter(b => b.kind === 'bill').sort(byNext) },
            { title: 'Subscriptions', bills: running.filter(b => b.kind === 'subscription').sort(byNext) },
            { title: 'Paused or ended', bills: bills.filter(b => !isRunning(b, today)) },
        ].filter(g => g.bills.length > 0)
    }, [bills, today])

    const dueFor = (bill: RecurringBill) => reserve.dues.find(d => d.bill.id === bill.id)

    const togglePause = async (bill: RecurringBill) => {
        setBusy(true)
        const { error } = await recurringBillsService.update(bill.id, { paused: !bill.paused })
        setBusy(false)
        if (error) { toast.error(error); return }
        toast.success(bill.paused ? `${bill.name} resumed.` : `${bill.name} paused.`)
        setOpen(null)
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

    const hero = (
        <header className="card p-5 relative overflow-hidden">
            <HeroGlow />
            <div className="relative">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Every month</p>
                <p className="mt-1.5 text-[30px] font-medium leading-none tracking-[-.03em] tabular-nums text-ink">
                    {formatCurrency(Math.round(costs.perMonth))}
                </p>
                <p className="mt-2 text-[12px] text-muted-ink">
                    {costs.count} running · {formatShortCurrency(costs.perYear)} a year
                    {costs.subscriptionsPerYear > 0 && <> · subscriptions {formatShortCurrency(costs.subscriptionsPerYear)}/yr</>}
                </p>
                {reserve.reserved > 0 && (
                    <p className="mt-3 pt-3 border-t border-line-soft text-[12px] text-muted-ink">
                        <span className="font-medium text-ink">{formatCurrency(reserve.reserved)}</span> set aside from safe to spend for bills still due this period.
                    </p>
                )}
                <button
                    type="button"
                    onClick={() => setAdding('')}
                    className="mt-4 w-full h-11 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add bill
                </button>
            </div>
        </header>
    )

    return (
        <>
            <PageHeader title="Bills" />
            <section className="px-4 pb-4 lg:px-0 space-y-4">
                {billsQuery.isPending ? <LoadingContent /> : (
                    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start lg:space-y-0">
                        <div className="lg:order-2">{hero}</div>

                        <div className="space-y-4 lg:order-1">
                            {bills.length === 0 ? (
                                <div className="card p-5">
                                    <span className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-info/10 text-info">
                                        <Receipt className="w-5 h-5" strokeWidth={1.9} />
                                    </span>
                                    <p className="mt-3 text-[14px] font-medium text-ink">No bills yet</p>
                                    <p className="mt-0.5 text-[12px] text-muted-ink leading-relaxed">
                                        Add what you pay every month or year. Safe to spend then holds back what’s still due, so it’s honest from the first day of the period.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {SUGGESTIONS.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setAdding(s)}
                                                className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-line bg-surface text-ink hover:bg-surface-soft transition-colors"
                                            >
                                                + {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {reserve.dues.length > 0 && activePeriod && (
                                        <div className="card px-4 pt-4 pb-2">
                                            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">This period</p>
                                            <div className="mt-1 divide-y divide-line-soft">
                                                {reserve.dues.map(due => (
                                                    <BillDueRow
                                                        key={due.bill.id}
                                                        due={due}
                                                        onPay={() => setPaying(due)}
                                                        onOpen={() => setOpen(due.bill)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {groups.map(group => (
                                        <div key={group.title}>
                                            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-1 mb-1.5">{group.title}</p>
                                            <div className="card overflow-hidden divide-y divide-line-soft">
                                                {group.bills.map(bill => {
                                                    const next = nextDueDate(bill, today)
                                                    const Icon = bill.kind === 'subscription' ? Repeat : Receipt
                                                    return (
                                                        <button
                                                            key={bill.id}
                                                            type="button"
                                                            onClick={() => setOpen(bill)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-soft transition-colors"
                                                        >
                                                            <span className={cn(
                                                                'w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0',
                                                                isRunning(bill, today) ? 'bg-info/10 text-info' : 'bg-surface-hover text-muted-ink'
                                                            )}>
                                                                <Icon className="w-4 h-4" strokeWidth={1.9} />
                                                            </span>
                                                            <span className="flex-1 min-w-0">
                                                                <span className="block text-[13px] font-medium text-ink truncate">{bill.name}</span>
                                                                <span className="block text-[11.5px] text-muted-ink truncate">
                                                                    {bill.paused ? 'Paused' : next ? `Next ${shortDate(next)} · ${scheduleLabel(bill)}` : 'Ended'}
                                                                </span>
                                                            </span>
                                                            <span className="text-right shrink-0">
                                                                <span className="block text-[13px] font-medium tabular-nums text-ink">{formatShortCurrency(bill.amount)}</span>
                                                                <span className="block text-[10.5px] text-subtle-ink">{bill.frequency === 'yearly' ? '/year' : '/month'}</span>
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
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

                <BottomDrawer open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''}>
                    {open && (() => {
                        const due = dueFor(open)
                        const next = nextDueDate(open, today)
                        return (
                            <div className="space-y-4 pb-2">
                                <div className="rounded-[20px] border border-line bg-surface p-4">
                                    <p className="text-[11.5px] text-muted-ink">{scheduleLabel(open)}</p>
                                    <p className="text-[22px] font-medium tracking-[-0.02em] text-ink mt-0.5">{formatCurrency(open.amount)}</p>
                                    <p className="text-[11.5px] text-muted-ink mt-1">
                                        {open.paused ? 'Paused: not held back from safe to spend.' : next ? `Next due ${shortDate(next)}` : 'No more payments due.'}
                                    </p>
                                </div>
                                {due && due.outstanding > 0 && activePeriod && (
                                    <button
                                        type="button"
                                        onClick={() => { setPaying(due); setOpen(null) }}
                                        className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors"
                                    >
                                        Pay {formatCurrency(open.amount)}
                                    </button>
                                )}
                                <div className="grid grid-cols-3 gap-2">
                                    <ActionButton icon={Pencil} label="Edit" onClick={() => { setEditing(open); setOpen(null) }} />
                                    <ActionButton icon={open.paused ? Play : Pause} label={open.paused ? 'Resume' : 'Pause'} onClick={() => togglePause(open)} disabled={busy} />
                                    <ActionButton icon={Trash2} label="Delete" danger onClick={() => { setDeleting(open); setOpen(null) }} />
                                </div>
                            </div>
                        )
                    })()}
                </BottomDrawer>

                <BottomDrawer open={!!paying} onClose={() => setPaying(null)} title={paying ? `Pay ${paying.bill.name}` : ''}>
                    {paying && activePeriod && (
                        <PayBillForm
                            key={paying.bill.id}
                            bill={paying.bill}
                            nextDue={paying.nextDue}
                            payPeriodId={activePeriod.id}
                            periodStart={activePeriod.start_date}
                            onSuccess={() => setPaying(null)}
                        />
                    )}
                </BottomDrawer>

                <ConfirmDrawer
                    open={!!deleting}
                    title="Delete bill"
                    description="Past payments stay in your ledger as ordinary expenses."
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

function ActionButton({ icon: Icon, label, onClick, danger, disabled }: {
    icon: typeof Pencil
    label: string
    onClick: () => void
    danger?: boolean
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'h-16 rounded-[14px] border border-line flex flex-col items-center justify-center gap-1 text-[12px] font-medium transition-colors hover:bg-surface-soft disabled:opacity-50',
                danger ? 'text-negative' : 'text-ink'
            )}
        >
            <Icon className="w-4 h-4" strokeWidth={1.9} />
            {label}
        </button>
    )
}
