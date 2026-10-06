import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { HeroGlow, HeroAction } from '@/components/hero'
import { OpenPeriodForm } from './components/open-period-form'
import { PeriodHistory } from './components/period-history'
import { ClosePeriodForm } from './components/close-period-form'
import { usePeriods } from '@/queries'
import { formatCurrency, formatDate, getDaysBetween } from '@/lib/helpers'
import { LoadingContent } from '@/components/loading-content'
import { PageHeader } from '@/components/page-header'

export function PeriodHistoryPage() {
    const { periods: allPeriods, activePeriod, isPending: loading } = usePeriods()
    const [openPeriodDrawer, setOpenPeriodDrawer] = useState(false)
    const [closePeriodDrawer, setClosePeriodDrawer] = useState(false)

    const dayNumber = Math.max(1, getDaysBetween(activePeriod?.start_date) + 1)

    const closedPeriods = allPeriods.filter(p => p.status === 'closed')

    const periodCard = activePeriod ? (
        <div className="card p-5 relative overflow-hidden lg:order-2">
            <HeroGlow />
            <div className="relative flex items-center justify-between mb-4">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Active period</p>
                <span className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface/60 backdrop-blur-md border border-line text-[12px] font-medium text-ink">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    Ongoing
                </span>
            </div>

            {/* Day N (both ends counted, like the dashboard) reads at a glance; "N days ago" didn't. */}
            <p className="relative text-[32px] lg:text-[26px] font-medium tracking-[-0.02em] leading-none text-ink tabular-nums">
                Day {dayNumber}
            </p>
            <p className="relative text-[11px] text-muted-ink mt-2">since {formatDate(activePeriod.start_date)}</p>

            <div className="relative mt-4 pt-3 border-t border-line-soft space-y-2">
                <div className="flex justify-between text-[12.5px]">
                    <span className="text-muted-ink">Expected income</span>
                    <span className="font-medium text-ink tabular-nums">{formatCurrency(activePeriod.salary_amount)}</span>
                </div>
                {activePeriod.notes && (
                    <div className="flex justify-between gap-3 text-[12.5px]">
                        <span className="text-muted-ink shrink-0">Notes</span>
                        <span className="font-medium text-ink text-right truncate">{activePeriod.notes}</span>
                    </div>
                )}
            </div>

            {/* Destructive and rare, so it stays quiet: red text on an outline, not a red slab. */}
            <button
                type="button"
                onClick={() => setClosePeriodDrawer(true)}
                className="relative mt-4 w-full h-11 rounded-[14px] border border-line text-[13px] font-semibold text-negative hover:bg-negative/5 transition-colors flex items-center justify-center gap-2"
            >
                <CheckCircle className="w-4 h-4" />
                Close period
            </button>
        </div>
    ) : (
        <div className="card p-5 relative overflow-hidden lg:order-2">
            <HeroGlow />
            <div className="relative flex items-center justify-between mb-4">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Active period</p>
                <HeroAction onClick={() => setOpenPeriodDrawer(true)}>Period</HeroAction>
            </div>
            <p className="relative text-[15px] font-medium text-ink">No active period</p>
            <p className="relative text-[11.5px] text-muted-ink mt-1">
                {closedPeriods.length > 0
                    ? `${closedPeriods.length} closed period${closedPeriods.length > 1 ? 's' : ''} in history — open the next one on payday.`
                    : 'Open a period on payday to start tracking your spending.'}
            </p>
        </div>
    )

    return (
        <>
            <PageHeader title="Period History" />
            <section className="px-4 pb-4 lg:px-0 space-y-4">
                {loading ? <LoadingContent /> : closedPeriods.length > 0 ? (
                    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start lg:space-y-0">
                        {periodCard}

                        <div className="lg:order-1">
                            <PeriodHistory periods={allPeriods} />
                        </div>
                    </div>
                ) : (
                    <div className="lg:max-w-[360px]">{periodCard}</div>
                )}

                {/* Drawers */}
                <BottomDrawer open={openPeriodDrawer} onClose={() => setOpenPeriodDrawer(false)} title="Open New Period">
                    <OpenPeriodForm onSuccess={() => setOpenPeriodDrawer(false)} />
                </BottomDrawer>
                <BottomDrawer open={closePeriodDrawer} onClose={() => setClosePeriodDrawer(false)} title="Close Period">
                    {activePeriod && (
                        <ClosePeriodForm
                            period={activePeriod}
                            onSuccess={() => setClosePeriodDrawer(false)}
                        />
                    )}
                </BottomDrawer>
            </section>
        </>
    )
}
