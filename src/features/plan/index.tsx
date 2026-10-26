import { useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import ClockIcon from '~icons/ph/clock-duotone'
import { BottomDrawer } from '@/components/bottom-drawer'
import { LoadingContent } from '@/components/loading-content'
import { PageHeader } from '@/components/page-header'
import { useBills, useDebts, usePeriods, usePeriodTransactions, useSavingsPace, useWishes } from '@/queries'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { daysUntil, formatCurrency, formatShortCurrency, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { DebtWithAccount, RecurringBill, WishListItem } from '@/types'
import { billCosts, isRunning, type BillDue } from '@/features/bills/lib/bills'
import { lastPayment } from '@/features/bills/lib/bill-history'
import { dayDate, monthYear, relativeDays } from '@/features/bills/lib/bill-labels'
import { useBillHistory } from '@/features/bills/hooks/use-bill-history'
import { BillTile } from '@/features/bills/components/bill-tile'
import { PayBillForm } from '@/features/bills/components/pay-bill-form'
import { payoffPlan } from '@/features/debts/lib/debt-insights'
import { sendReminder } from '@/features/debts/lib/reminder'
import { DebtAvatar } from '@/features/debts/components/debt-avatar'
import { PayDebtForm } from '@/features/debts/components/pay-debt-form'
import { buildRoadmap, partsBreakdown, wishProgress } from '@/features/wish-list/lib/wish-analytics'
import { WishTile } from '@/features/wish-list/components/wish-tile'
import { PillButton, PlanRow, PlanSection, RowAmount } from './components/layout'
import { SmartLine } from './components/smart-line'
import { upcomingPlan, type UpcomingItem } from './lib/upcoming'

const NO_BILLS: RecurringBill[] = []
const NO_DEBTS: DebtWithAccount[] = []
const NO_WISHES: WishListItem[] = []

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))

const TABS = [
    { to: '/bills', label: 'Bills' },
    { to: '/debts', label: 'Debts' },
    { to: '/wish-list', label: 'Wishlist' },
]

/** What has to be paid, and when: bills and debts by pay period, with links to each list. */
export default function PlanPage() {
    const { activePeriod, isPending: periodsPending } = usePeriods()
    const billsQuery = useBills()
    const bills = billsQuery.data ?? NO_BILLS
    const { data: periodTxs } = usePeriodTransactions(activePeriod?.id)
    const reserve = useBillReserve(activePeriod, periodTxs)
    const debtsQuery = useDebts({ activeOnly: true })
    const debts = debtsQuery.data ?? NO_DEBTS
    const { data: wishes = NO_WISHES } = useWishes()
    const pace = useSavingsPace()
    const history = useBillHistory()
    const today = toISODate()

    const [payingBill, setPayingBill] = useState<BillDue | null>(null)
    const [payingDebt, setPayingDebt] = useState<DebtWithAccount | null>(null)

    const plan = useMemo(
        () => (reserve.window ? upcomingPlan({ dues: reserve.dues, bills, debts, window: reserve.window }) : null),
        [reserve, bills, debts]
    )
    const debtPlan = useMemo(() => payoffPlan(debts, pace), [debts, pace])
    const loading = periodsPending || billsQuery.isPending || debtsQuery.isPending

    const itemRow = (item: UpcomingItem, payable: boolean) => {
        const days = daysUntil(item.date)
        const when = `${dayDate(item.date)} · ${relativeDays(days)}`
        if (item.kind === 'bill') {
            const sub = payable
                ? `${when}${item.count > 1 ? ` · ${item.count} due` : ''}`
                : `${dayDate(item.date)} · ${item.bill.frequency === 'yearly' ? 'yearly' : 'monthly'}${item.count > 1 ? ` · ${item.count} due` : ''}`
            return (
                <PlanRow
                    key={item.key}
                    lead={<BillTile bill={item.bill} />}
                    title={item.bill.name}
                    sub={sub}
                    subClassName={days < 0 ? 'text-negative' : undefined}
                    end={payable && activePeriod
                        ? <PillButton onClick={() => setPayingBill(item.due)}>Pay {formatShortCurrency(item.bill.amount)}</PillButton>
                        : <RowAmount>{plain(item.amount)}</RowAmount>}
                />
            )
        }
        return (
            <PlanRow
                key={item.key}
                lead={<DebtAvatar name={item.debt.counterparty} late={days < 0} />}
                title={`Pay back ${item.debt.counterparty}`}
                sub={payable ? when : dayDate(item.date)}
                subClassName={days < 0 ? 'text-negative' : undefined}
                end={payable && activePeriod
                    ? <PillButton onClick={() => setPayingDebt(item.debt)}>Pay {formatShortCurrency(item.amount)}</PillButton>
                    : <RowAmount>{plain(item.amount)}</RowAmount>}
            />
        )
    }

    const receivableRow = (d: DebtWithAccount) => {
        const days = d.due_date ? daysUntil(d.due_date) : null
        const when = days === null ? 'No due date' : days < 0 ? `${-days} day${days === -1 ? '' : 's'} late` : `Due ${dayDate(d.due_date!)}`
        return (
            <PlanRow
                key={d.id}
                lead={<DebtAvatar name={d.counterparty} late={days !== null && days < 0} />}
                title={d.counterparty}
                sub={`${when} · ${formatCurrency(d.remaining_amount)}`}
                subClassName={days !== null && days < 0 ? 'text-negative' : undefined}
                end={<PillButton onClick={() => sendReminder(d)}>Remind</PillButton>}
            />
        )
    }

    const upcoming = loading ? <LoadingContent /> : !plan ? (
        <p className="px-1 text-[13px] text-muted-ink leading-relaxed">
            Open a pay period to see what’s due before payday and what the next one already holds.
        </p>
    ) : (
        <div className="space-y-6">
            {(plan.setAside > 0 || plan.nextCommitted > 0) && (
                <SmartLine icon={ClockIcon}>
                    {plan.setAside > 0
                        ? <><b>{formatCurrency(plan.setAside)}</b> is set aside for {plan.setAsideCount} bill{plan.setAsideCount === 1 ? '' : 's'} before payday.</>
                        : <>Every bill this period is paid.</>}
                    {plan.nextCommitted > 0 && <> Next period already has <b>{formatShortCurrency(plan.nextCommitted)}</b> committed.</>}
                    {reserve.window?.estimated && <> Payday is estimated from your last period.</>}
                </SmartLine>
            )}

            {plan.beforePayday.length > 0 && (
                <PlanSection title="Before payday" meta={plain(plan.beforePayday.reduce((s, i) => s + i.amount, 0))}>
                    {plan.beforePayday.map(i => itemRow(i, true))}
                </PlanSection>
            )}

            {plan.nextPeriod.length > 0 && (
                <PlanSection title="Next period" meta={plain(plan.nextCommitted)}>
                    {plan.nextPeriod.map(i => itemRow(i, false))}
                </PlanSection>
            )}

            {plan.owedToYou.length > 0 && (
                <PlanSection title="Owed to you" meta={plain(plan.owedToYou.reduce((s, d) => s + d.remaining_amount, 0))}>
                    {plan.owedToYou.map(receivableRow)}
                </PlanSection>
            )}

            {plan.beforePayday.length === 0 && plan.nextPeriod.length === 0 && plan.owedToYou.length === 0 && (
                <p className="px-1 text-[13px] text-muted-ink leading-relaxed">
                    Nothing is due before payday or in the next period. Bills and dated debts show up here as they come due.
                </p>
            )}
        </div>
    )

    return (
        <>
            <PageHeader title="Plan" />
            <nav aria-label="Plan" className="lg:hidden flex gap-2 overflow-x-auto px-4 pb-4">
                <span aria-current="page" className="h-10 px-4 rounded-full bg-action text-on-action text-[14px] font-semibold flex items-center shrink-0">Upcoming</span>
                {TABS.map(t => (
                    <NavLink key={t.to} to={t.to} className="h-10 px-4 rounded-full border border-line bg-surface text-muted-ink text-[14px] font-medium flex items-center shrink-0 hover:text-ink">
                        {t.label}
                    </NavLink>
                ))}
            </nav>

            <section className="px-4 pb-4 lg:px-0 lg:grid lg:grid-cols-[1fr_300px] lg:gap-10 lg:items-start">
                {upcoming}
                <aside className="hidden lg:block space-y-7">
                    <Summaries bills={bills} dues={reserve.dues} debts={debts} debtFree={debtPlan.debtFreeDate} wishes={wishes} roadmap={buildRoadmap(wishes, pace)} today={today} />
                </aside>
            </section>

            <BottomDrawer open={!!payingBill} onClose={() => setPayingBill(null)} title={payingBill ? `Pay ${payingBill.bill.name}` : ''}>
                {payingBill && activePeriod && (
                    <PayBillForm
                        key={payingBill.bill.id}
                        bill={payingBill.bill}
                        nextDue={payingBill.nextDue}
                        payPeriodId={activePeriod.id}
                        periodStart={activePeriod.start_date}
                        lastPaid={lastPayment(history?.get(payingBill.bill.id))}
                        onSuccess={() => setPayingBill(null)}
                    />
                )}
            </BottomDrawer>

            <BottomDrawer open={!!payingDebt} onClose={() => setPayingDebt(null)} title={payingDebt ? `Pay back ${payingDebt.counterparty}` : ''}>
                {payingDebt && activePeriod && (
                    <PayDebtForm
                        key={payingDebt.id}
                        debt={payingDebt}
                        plannedAmount={debtPlan.stops.find(s => s.debt.id === payingDebt.id)?.perPeriodNeeded}
                        payPeriodId={activePeriod.id}
                        periodStartDate={activePeriod.start_date}
                        onSuccess={() => setPayingDebt(null)}
                    />
                )}
            </BottomDrawer>
        </>
    )
}

function SummaryHead({ title, to }: { title: string; to: string }) {
    return (
        <div className="flex items-baseline justify-between mb-1.5">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            <Link to={to} className="text-[13px] font-semibold text-brand-ink hover:text-brand">Open</Link>
        </div>
    )
}

function SummaryLine({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-[13px] text-muted-ink">{label}</span>
            <span className={cn('text-[13px] font-medium tabular-nums', className ?? 'text-ink')}>{value}</span>
        </div>
    )
}

/** The desktop side column: one glance at each list, each a link away. */
function Summaries({ bills, dues, debts, debtFree, wishes, roadmap, today }: {
    bills: RecurringBill[]
    dues: BillDue[]
    debts: DebtWithAccount[]
    debtFree: string | null
    wishes: WishListItem[]
    roadmap: ReturnType<typeof buildRoadmap>
    today: string
}) {
    const costs = billCosts(bills, today)
    const due = dues.filter(d => d.outstanding > 0).length
    const paid = dues.filter(d => d.outstanding === 0).length
    const paused = bills.filter(b => !isRunning(b, today)).length
    const owed = debts.filter(d => d.type === 'debt').reduce((s, d) => s + d.remaining_amount, 0)
    const receivable = debts.filter(d => d.type === 'receivable').reduce((s, d) => s + d.remaining_amount, 0)
    const stopById = new Map(roadmap.map(s => [s.item.id, s]))
    const shownWishes = roadmap.slice(0, 3).map(s => s.item)
    const extraWishes = wishes.filter(w => !stopById.has(w.id)).slice(0, Math.max(0, 3 - shownWishes.length))

    return (
        <>
            <div>
                <SummaryHead title="Bills" to="/bills" />
                <p className="text-[22px] font-semibold tracking-[-0.02em] text-ink tabular-nums">
                    {formatCurrency(Math.round(costs.perMonth))}<span className="text-[13px] font-normal text-muted-ink"> / month</span>
                </p>
                <p className="text-[12.5px] text-muted-ink">
                    {[due > 0 && `${due} due`, paid > 0 && `${paid} paid`, paused > 0 && `${paused} paused`].filter(Boolean).join(' · ') || `${bills.length} bill${bills.length === 1 ? '' : 's'}`}
                </p>
            </div>
            <div>
                <SummaryHead title="Debts" to="/debts" />
                <div className="divide-y divide-line-soft">
                    <SummaryLine label="You owe" value={plain(owed)} />
                    <SummaryLine label="Owed to you" value={plain(receivable)} className="text-brand-ink" />
                    {owed > 0 && <SummaryLine label="Debt-free" value={debtFree ? monthYear(debtFree) : 'No estimate yet'} />}
                </div>
            </div>
            <div>
                <SummaryHead title="Wishlist" to="/wish-list" />
                {wishes.length === 0 ? (
                    <p className="text-[12.5px] text-muted-ink">Nothing on the list yet.</p>
                ) : (
                    <div className="divide-y divide-line-soft">
                        {[...shownWishes, ...extraWishes].map(w => {
                            const p = wishProgress(w)
                            const parts = partsBreakdown(w)
                            const stop = stopById.get(w.id)
                            return (
                                <PlanRow
                                    key={w.id}
                                    lead={<WishTile name={w.name} icon={w.icon} />}
                                    title={w.name}
                                    sub={p.ready ? 'Ready to buy' : parts ? `${parts.bought} of ${parts.total} parts` : `${p.percent}% saved`}
                                    subClassName={p.ready ? 'text-brand-ink' : undefined}
                                    end={!p.ready && stop?.date ? <span className="text-[13px] text-ink tabular-nums">~{stop.date.slice(0, 4) === today.slice(0, 4) ? monthYear(stop.date).split(' ')[0] : monthYear(stop.date)}</span> : undefined}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}
