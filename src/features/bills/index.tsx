import { useMemo, useState } from 'react'
import { Receipt, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { LoadingContent } from '@/components/loading-content'
import { PageHeader } from '@/components/page-header'
import { useBills, usePeriods, usePeriodTransactions } from '@/queries'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { recurringBillsService } from '@/services/recurring-bills.service'
import { formatShortCurrency, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { BillKind, RecurringBill } from '@/types'
import { billCosts, billShares, isRunning, nextDueDate, yearlyAhead, type BillDue } from './lib/bills'
import { scheduleLabel, shortDate } from './lib/bill-labels'
import { BillDetail } from './components/bill-detail'
import { BillDueRow } from './components/bill-due-row'
import { BillForm } from './components/bill-form'
import { BillsBreakdown } from './components/bills-breakdown'
import { BillsHero } from './components/bills-hero'
import { BillsYearly } from './components/bills-yearly'
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
    const shares = useMemo(() => billShares(bills, today), [bills, today])
    const ahead = useMemo(() => yearlyAhead(bills, today), [bills, today])
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
        <BillsHero
            dues={reserve.dues}
            reserved={reserve.reserved}
            billCount={bills.length}
            hasPeriod={!!activePeriod}
            onAdd={() => setAdding('')}
        />
    )
    const breakdownCard = (
        <BillsBreakdown costs={costs} shares={shares} salary={activePeriod?.salary_amount ?? null} onOpen={setOpen} />
    )
    const yearlyCard = <BillsYearly ahead={ahead} onOpen={setOpen} />

    return (
        <>
            <PageHeader title="Bills" />
            <section className="px-4 pb-4 lg:px-0 space-y-4">
                {billsQuery.isPending ? <LoadingContent /> : (
                    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start lg:space-y-0">
                        <div className="space-y-4 lg:order-2">
                            {hero}
                            <div className="hidden lg:block space-y-4">{breakdownCard}{yearlyCard}</div>
                        </div>

                        <div className="space-y-4 lg:order-1">
                            {bills.length === 0 ? (
                                <div className="card p-5">
                                    <span className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-info/10 text-info">
                                        <Receipt className="w-5 h-5" strokeWidth={1.9} />
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
                            <div className="lg:hidden space-y-4">{breakdownCard}{yearlyCard}</div>
                        </div>
                    </div>
                )}

                <BottomDrawer open={adding !== null} onClose={() => setAdding(null)} title="Add Bill">
                    {adding !== null && (
                        <BillForm
                            key={adding}
                            preset={adding ? suggestion(adding) : undefined}
                            onSuccess={() => setAdding(null)}
                        />
                    )}
                </BottomDrawer>

                <BottomDrawer open={!!editing} onClose={() => setEditing(null)} title="Edit Bill">
                    {editing && <BillForm key={editing.id} initial={editing} onSuccess={() => setEditing(null)} />}
                </BottomDrawer>

                {/* Detail sheet — each action closes it and hands off to its own drawer */}
                <BottomDrawer open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''}>
                    {open && (
                        <BillDetail
                            bill={open}
                            due={activePeriod ? dueFor(open) : undefined}
                            nextDue={nextDueDate(open, today)}
                            busy={busy}
                            onPay={() => { const due = dueFor(open); if (due) setPaying(due); setOpen(null) }}
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
                            onSuccess={() => setPaying(null)}
                        />
                    )}
                </BottomDrawer>

                <ConfirmDrawer
                    open={!!deleting}
                    title="Delete Bill"
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
