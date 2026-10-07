import { useState } from 'react'
import { createPortal } from 'react-dom'
import { BottomDrawer } from '@/components/bottom-drawer'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { OpenPeriodForm } from '@/features/periods/components/open-period-form'
import { PeriodChip } from '@/features/transactions/components/period-chip'
import { useSelectedPeriod } from '@/stores/period-store'
import { LoadingContent } from '@/components/loading-content'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { OverviewTransaction } from './components/overview/overview-tab'
import { TodayEmptyState } from './components/overview/today-empty-state'

export default function DashboardPage() {
    const { periods: allPeriods, activePeriod, selectedPeriod, isActivePeriod, isPending: periodLoading, selectPeriod } = useSelectedPeriod()
    const [periodDrawerOpen, setPeriodDrawerOpen] = useState(false)
    const [openPeriodDrawer, setOpenPeriodDrawer] = useState(false)
    const closedPeriodsCount = allPeriods.filter(p => p.status === 'closed').length
    const topBarSlotNode = useTopBarSlotNode()

    return (
        <>
            {topBarSlotNode && selectedPeriod && createPortal(
                <PeriodChip period={selectedPeriod} onClick={() => setPeriodDrawerOpen(true)} />,
                topBarSlotNode
            )}

            {/* Accounts is in the bottom nav, so the header is just the brand and the period. */}
            <header className="flex items-center justify-between gap-3 px-5 pt-[22px] bg-neutral-50 dark:bg-neutral-950 lg:hidden">
                <div className="flex items-center gap-2">
                    <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-6 h-6" />
                    <span className="text-[16px] font-semibold tracking-[-0.02em] text-ink">Mouny.</span>
                </div>
                {selectedPeriod && (
                    <PeriodChip period={selectedPeriod} onClick={() => setPeriodDrawerOpen(true)} />
                )}
            </header>

            <section className="px-4 pb-4 pt-2.5 lg:px-0 space-y-4">
                {periodLoading ? <LoadingContent /> : (
                    <>
                        {!selectedPeriod && (
                            <TodayEmptyState
                                closedPeriodsCount={closedPeriodsCount}
                                onOpenPeriod={() => setOpenPeriodDrawer(true)}
                            />
                        )}

                        {selectedPeriod && (
                            <OverviewTransaction
                                periodId={selectedPeriod.id}
                                isActivePeriod={isActivePeriod}
                            />
                        )}
                    </>
                )}

                <PeriodPickerDrawer
                    open={periodDrawerOpen}
                    onClose={() => setPeriodDrawerOpen(false)}
                    periods={allPeriods}
                    activePeriodId={activePeriod?.id}
                    selectedPeriodId={selectedPeriod?.id}
                    onSelect={(period) => {
                        selectPeriod(period)
                        setPeriodDrawerOpen(false)
                    }}
                />

                <BottomDrawer open={openPeriodDrawer} onClose={() => setOpenPeriodDrawer(false)} title="Open New Period">
                    <OpenPeriodForm onSuccess={() => { setOpenPeriodDrawer(false) }} />
                </BottomDrawer>
            </section>
        </>
    )
}