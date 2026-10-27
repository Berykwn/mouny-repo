import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChartLine, House, StickyNote } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { EmptyState, EMPTY_STATE_BUTTON } from '@/components/empty-state'
import { RetryInline } from '@/components/retry-inline'
import { OpenPeriodForm } from './components/open-period-form'
import { PeriodHistory } from './components/period-history'
import { ClosePeriodForm } from './components/close-period-form'
import { usePeriods, usePeriodSummaries } from '@/queries'
import { usePeriodStore } from '@/stores/period-store'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { formatCurrency } from '@/lib/helpers'
import { unspentPct, type PeriodSummary } from '@/lib/period-summary'
import { cn } from '@/lib/utils'
import type { PayPeriod } from '@/types'
import { LoadingContent } from '@/components/loading-content'
import { PageHeader } from '@/components/page-header'
import { paydayLabel, periodDayLabel, periodMonth, periodProgress, periodRange } from './lib/period-progress'

type Drawer = 'open' | 'close' | null

const NO_SUMMARIES: Record<string, PeriodSummary> = {}

export function PeriodHistoryPage() {
    const { periods: allPeriods, activePeriod, isPending: loading, error, refetch, isRefetching } = usePeriods()
    const [drawer, setDrawer] = useState<Drawer>(null)
    const [viewing, setViewing] = useState<PayPeriod | null>(null)
    const location = useLocation()
    const navigate = useNavigate()
    const topBarSlot = useTopBarSlotNode()

    const closedPeriods = useMemo(
        () => allPeriods.filter(p => p.status === 'closed').sort((a, b) => b.start_date.localeCompare(a.start_date)),
        [allPeriods],
    )
    const { data: summaries = NO_SUMMARIES } = usePeriodSummaries(allPeriods.map(p => p.id))

    // The command palette and other pages ask for a drawer through the navigation state.
    useEffect(() => {
        const state = location.state as { open?: boolean; close?: boolean } | null
        if (!state || loading) return
        if (state.close && activePeriod) setDrawer('close')
        else if (state.open && !activePeriod) setDrawer('open')
        navigate(location.pathname, { replace: true, state: null })
    }, [location.state, location.pathname, loading, activePeriod, navigate])

    /** Home and Insights follow the period store, so looking at a past period is picking it there. */
    const openIn = (period: PayPeriod, to: '/' | '/insights') => {
        usePeriodStore.getState().setSelectedPeriodId(period.id === activePeriod?.id ? null : period.id)
        navigate(to)
    }

    const closeButton = activePeriod && topBarSlot && createPortal(
        <button
            type="button"
            onClick={() => setDrawer('close')}
            className="h-9 px-4 rounded-[10px] border border-line text-[13px] font-semibold text-ink hover:bg-surface-hover transition-colors"
        >
            Close period
        </button>,
        topBarSlot,
    )

    return (
        <>
            <PageHeader title="Periods" back="/menu" />
            {closeButton}
            <section className="px-4 pb-6 lg:px-0 space-y-6">
                {loading ? <LoadingContent /> : error && allPeriods.length === 0 ? (
                    <RetryInline what="Your periods" onRetry={() => void refetch()} retrying={isRefetching} />
                ) : allPeriods.length === 0 ? (
                    <EmptyState
                        title="Start your first pay period"
                        action={<button type="button" onClick={() => setDrawer('open')} className={EMPTY_STATE_BUTTON}>Open a period</button>}
                    >
                        Pick the day your pay arrives. Mouny works out what you can spend each day from there.
                    </EmptyState>
                ) : (
                    <>
                        {activePeriod
                            ? <ActiveCard period={activePeriod} periods={allPeriods} summary={summaries[activePeriod.id]} onClose={() => setDrawer('close')} onOpen={() => openIn(activePeriod, '/')} />
                            : (
                                <div className="rounded-[16px] border border-line p-4 lg:max-w-[520px]">
                                    <p className="text-[16px] font-semibold text-ink">No period running</p>
                                    <p className="mt-0.5 text-[13.5px] text-muted-ink">Open the next one on payday; every transaction lands in it.</p>
                                    <button type="button" onClick={() => setDrawer('open')} className={cn(EMPTY_STATE_BUTTON, 'mt-4')}>Open a period</button>
                                </div>
                            )}

                        {closedPeriods.length > 0 && (
                            <div>
                                <h2 className="lg:hidden text-[17px] font-semibold text-ink mb-1">History</h2>
                                <PeriodHistory periods={closedPeriods} summaries={summaries} onOpen={setViewing} />
                            </div>
                        )}
                    </>
                )}

                {/* Drawers */}
                <BottomDrawer open={drawer === 'open'} onClose={() => setDrawer(null)} title="Open a period">
                    {drawer === 'open' && <OpenPeriodForm onSuccess={() => setDrawer(null)} />}
                </BottomDrawer>
                <BottomDrawer
                    open={drawer === 'close'}
                    onClose={() => setDrawer(null)}
                    title={activePeriod ? `Close ${periodMonth(activePeriod.start_date, periodProgress(activePeriod, allPeriods).endDate)}` : 'Close period'}
                >
                    {activePeriod && drawer === 'close' && (
                        <ClosePeriodForm
                            period={activePeriod}
                            onSuccess={() => setDrawer(null)}
                            onClosed={openNext => { if (openNext) setDrawer('open') }}
                        />
                    )}
                </BottomDrawer>
                <BottomDrawer
                    open={!!viewing}
                    onClose={() => setViewing(null)}
                    title={viewing ? periodMonth(viewing.start_date, viewing.end_date, true) : ''}
                >
                    {viewing && (
                        <PastPeriod
                            period={viewing}
                            summary={summaries[viewing.id]}
                            onOpen={to => { setViewing(null); openIn(viewing, to) }}
                        />
                    )}
                </BottomDrawer>
            </section>
        </>
    )
}

interface ActiveCardProps {
    period: PayPeriod
    periods: PayPeriod[]
    summary: PeriodSummary | undefined
    onClose: () => void
    onOpen: () => void
}

/** The running period: its days so far, and the quiet way to close it. */
function ActiveCard({ period, periods, summary, onClose, onOpen }: ActiveCardProps) {
    const progress = periodProgress(period, periods)
    const payday = paydayLabel(progress)
    const pct = summary ? unspentPct(summary.unspent, summary.income) : null

    return (
        <div className="rounded-[16px] border border-line p-4 lg:max-w-[520px]">
            <button type="button" onClick={onOpen} className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[17px] font-semibold text-ink">{periodMonth(period.start_date, progress.endDate)}</p>
                        <p className="text-[13.5px] text-subtle-ink tabular-nums">
                            {periodRange(period.start_date, progress.pastUsualLength ? null : progress.endDate, progress.estimated)} · {periodDayLabel(progress).toLowerCase()}
                            {payday && ` · ${payday}`}
                        </p>
                    </div>
                    <span className="flex items-center gap-1.5 text-[14px] font-semibold text-muted-ink shrink-0">
                        <span className="w-2 h-2 rounded-full bg-brand" /> Active
                    </span>
                </div>
                {progress.fraction !== null && (
                    <div className="mt-3.5 h-1 rounded-full bg-line-soft overflow-hidden">
                        <div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
                    </div>
                )}
                {summary && summary.income > 0 && (
                    <p className="mt-2.5 text-[13px] text-subtle-ink tabular-nums">
                        {formatCurrency(summary.spending)} spent{pct !== null && ` · ${pct}% of income kept so far`}
                    </p>
                )}
            </button>
            <button
                type="button"
                onClick={onClose}
                className="lg:hidden mt-3.5 w-full h-12 rounded-[14px] bg-line-soft text-[15px] font-semibold text-ink hover:bg-surface-hover transition-colors"
            >
                Close period
            </button>
        </div>
    )
}

interface PastPeriodProps {
    period: PayPeriod
    summary: PeriodSummary | undefined
    onOpen: (to: '/' | '/insights') => void
}

/** One closed period's numbers, and the way back into it on Home or Insights. */
function PastPeriod({ period, summary, onOpen }: PastPeriodProps) {
    const pct = summary ? unspentPct(summary.unspent, summary.income) : null
    const lines: [string, string, string?][] = summary ? [
        ['Income', formatCurrency(summary.income)],
        ['Spent', formatCurrency(summary.spending)],
        ['Saved', formatCurrency(summary.savings)],
        ['Left over', formatCurrency(summary.net), summary.net < 0 ? 'text-negative' : undefined],
        ['Kept', pct !== null ? `${formatCurrency(summary.unspent)} · ${pct}%` : formatCurrency(summary.unspent)],
    ] : []
    if (period.closing_balance !== null) lines.push(['Closing balance', formatCurrency(period.closing_balance)])

    return (
        <div className="space-y-4 pb-2">
            <p className="text-[13.5px] text-subtle-ink">{periodRange(period.start_date, period.end_date)}</p>
            <div>
                {lines.map(([label, value, cls]) => (
                    <div key={label} className="flex items-center justify-between gap-3 py-2.5 border-b border-line-soft text-[14.5px]">
                        <span className="text-muted-ink">{label}</span>
                        <span className={cn('tabular-nums text-ink', cls)}>{value}</span>
                    </div>
                ))}
                <p className="pt-2 text-[12px] text-subtle-ink">Kept is income not spent: savings plus what was left over.</p>
            </div>
            {period.notes && (
                <p className="flex items-start gap-2 text-[13px] text-muted-ink rounded-[12px] bg-line-soft px-3 py-2.5">
                    <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {period.notes}
                </p>
            )}
            <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onOpen('/')} className="h-12 rounded-[14px] bg-action text-on-action text-[14px] font-semibold hover:bg-action/90 transition-colors flex items-center justify-center gap-2">
                    <House className="w-4 h-4" /> Open in Home
                </button>
                <button type="button" onClick={() => onOpen('/insights')} className="h-12 rounded-[14px] bg-line-soft text-ink text-[14px] font-semibold hover:bg-surface-hover transition-colors flex items-center justify-center gap-2">
                    <ChartLine className="w-4 h-4" /> Insights
                </button>
            </div>
        </div>
    )
}
