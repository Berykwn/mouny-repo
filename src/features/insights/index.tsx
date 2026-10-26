import { useState } from 'react'
import { createPortal } from 'react-dom'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { PageHeader } from '@/components/page-header'
import { PeriodChip } from '@/features/transactions/components/period-chip'
import { useSelectedPeriod } from '@/stores/period-store'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { comparableSpending } from '@/lib/comparable-spending'
import { useOverviewData } from '@/features/dashboard/hooks/use-overview-data'
import { OverviewSkeleton } from '@/features/dashboard/components/overview/overview-skeleton'
import { AnalyticsSection } from '@/features/dashboard/components/analytics/analytics-section'

/** Everything that explains a period: where the money went, habits, cash flow and trends. */
export default function InsightsPage() {
    const { periods, activePeriod, selectedPeriod, isPending, selectPeriod } = useSelectedPeriod()
    const [pickerOpen, setPickerOpen] = useState(false)
    const topBarSlotNode = useTopBarSlotNode()

    const chip = selectedPeriod && <PeriodChip period={selectedPeriod} onClick={() => setPickerOpen(true)} />

    return (
        <>
            {topBarSlotNode && chip && createPortal(chip, topBarSlotNode)}
            <PageHeader title="Insights" action={chip} />

            <section className="px-4 pb-4 lg:px-0">
                {isPending ? <OverviewSkeleton /> : selectedPeriod ? (
                    <InsightsBody periodId={selectedPeriod.id} />
                ) : (
                    <div className="card p-5">
                        <p className="text-[14px] font-medium text-ink">Nothing to analyse yet</p>
                        <p className="mt-1 text-[12px] text-muted-ink leading-relaxed">
                            Insights appear once a pay period has a few transactions in it.
                        </p>
                    </div>
                )}
            </section>

            <PeriodPickerDrawer
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                periods={periods}
                activePeriodId={activePeriod?.id}
                selectedPeriodId={selectedPeriod?.id}
                onSelect={(period) => {
                    selectPeriod(period)
                    setPickerOpen(false)
                }}
            />
        </>
    )
}

function InsightsBody({ periodId }: { periodId: string }) {
    const { data, loading, retry } = useOverviewData(periodId)
    const reserve = useBillReserve(data?.period, data?.transactions)
    const stats = usePeriodStats({
        period: data?.period ?? { start_date: '', end_date: null },
        transactions: data?.transactions ?? [],
        fallbackTotalDays: data?.fallbackTotalDays ?? null,
        reservedBills: reserve.reserved,
    })
    const comparable = comparableSpending(stats)

    if (loading) return <OverviewSkeleton />
    if (!data) return (
        <section role="alert" className="card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
                <h2 className="text-[13px] font-medium text-ink">Failed to load period data.</h2>
                <p className="text-[11.5px] text-muted-ink mt-1">Check your connection and try again.</p>
            </div>
            <button
                type="button"
                onClick={retry}
                className="shrink-0 h-9 rounded-[10px] bg-action px-4 text-[12.5px] font-semibold text-on-action transition-colors hover:bg-action/90"
            >
                Retry
            </button>
        </section>
    )

    return <AnalyticsSection data={data} stats={stats} comparable={comparable} />
}
