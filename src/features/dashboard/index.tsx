import { lazy, Suspense, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { getInitials } from '@/lib/helpers'
import { BottomDrawer } from '@/components/bottom-drawer'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { PeriodChip } from '@/features/transactions/components/period-chip'
import { useSelectedPeriod } from '@/stores/period-store'
import { OverviewSkeleton } from './components/overview/overview-skeleton'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { OverviewTransaction } from './components/overview/overview-tab'
import { TodayEmptyState } from './components/overview/today-empty-state'
import { HomeGreeting } from './components/home/home-greeting'
import { FirstSteps } from '@/features/onboarding/first-steps'

// Only needed once the drawer opens; its date picker and form code load then.
const OpenPeriodForm = lazy(() => import('@/features/periods/components/open-period-form').then(m => ({ default: m.OpenPeriodForm })))

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

            {/* Brand, the period, and the avatar that opens Settings. Accounts open from the balances row. */}
            <header className="flex items-center justify-between gap-3 px-5 pt-[22px] lg:hidden">
                <div className="flex items-center gap-2">
                    <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-6 h-6" />
                    <span className="text-[16px] font-semibold tracking-[-0.02em] text-ink">Mouny.</span>
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

            <section className="px-4 pb-4 pt-5 lg:pt-0 lg:px-0 space-y-4">
                {/* The hello sits above the numbers, where it has room; the header keeps the brand. */}
                <HomeGreeting />
                {periodLoading ? <OverviewSkeleton /> : (
                    <>
                        {/* Someone who has never had a period sets up first; after that it's payday again. */}
                        {!selectedPeriod && allPeriods.length === 0 && (
                            <FirstSteps onOpenPeriod={() => setOpenPeriodDrawer(true)} />
                        )}

                        {!selectedPeriod && allPeriods.length > 0 && (
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
                    <Suspense fallback={null}>
                        <OpenPeriodForm onSuccess={() => { setOpenPeriodDrawer(false) }} />
                    </Suspense>
                </BottomDrawer>
            </section>
        </>
    )
}