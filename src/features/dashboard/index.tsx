import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { getInitials } from '@/lib/helpers'
import { BottomDrawer } from '@/components/bottom-drawer'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { OpenPeriodForm } from '@/features/periods/components/open-period-form'
import { PeriodChip } from '@/features/transactions/components/period-chip'
import { useSelectedPeriod } from '@/stores/period-store'
import { OverviewSkeleton } from './components/overview/overview-skeleton'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { OverviewTransaction } from './components/overview/overview-tab'
import { TodayEmptyState } from './components/overview/today-empty-state'
import { HomeGreeting } from './components/home/home-greeting'

export default function DashboardPage() {
    const { periods: allPeriods, activePeriod, selectedPeriod, isActivePeriod, isPending: periodLoading, selectPeriod } = useSelectedPeriod()
    const [periodDrawerOpen, setPeriodDrawerOpen] = useState(false)
    const [openPeriodDrawer, setOpenPeriodDrawer] = useState(false)
    const closedPeriodsCount = allPeriods.filter(p => p.status === 'closed').length
    const topBarSlotNode = useTopBarSlotNode()
    const { user } = useAuth()

    return (
        <>
            {topBarSlotNode && selectedPeriod && createPortal(
                <PeriodChip period={selectedPeriod} onClick={() => setPeriodDrawerOpen(true)} />,
                topBarSlotNode
            )}

            {/* A hello, the period, and the avatar that opens Settings. Accounts open from the balances row. */}
            <header className="flex items-center justify-between gap-3 px-5 pt-[22px] lg:hidden">
                <div className="min-w-0">
                    <HomeGreeting />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {selectedPeriod && (
                        <PeriodChip period={selectedPeriod} onClick={() => setPeriodDrawerOpen(true)} />
                    )}
                    <Link to="/menu" aria-label="Settings" className="w-8 h-8 rounded-full bg-ink flex items-center justify-center shrink-0">
                        <span className="text-[11.5px] font-semibold text-on-ink">{getInitials(user)}</span>
                    </Link>
                </div>
            </header>

            <section className="px-4 pb-4 pt-2.5 lg:pt-0 lg:px-0 space-y-4">
                <div className="hidden lg:block">
                    <HomeGreeting />
                </div>
                {periodLoading ? <OverviewSkeleton /> : (
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