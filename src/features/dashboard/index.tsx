import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Coins } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { OpenPeriodForm } from '@/features/periods/components/open-period-form'
import { PeriodChip } from '@/features/transactions/components/period-chip'
import { payPeriodsService } from '@/services/pay-periods.service'
import type { PayPeriod } from '@/types'
import { LoadingContent } from '@/components/loading-content'
import { useAuth } from '@/hooks/use-auth'
import { getInitials } from '@/lib/helpers'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { OverviewTransaction } from './components/overview/overview-tab'
import { TodayEmptyState } from './components/overview/today-empty-state'

export default function DashboardPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [allPeriods, setAllPeriods] = useState<PayPeriod[]>([])
    const [selectedPeriod, setSelectedPeriod] = useState<PayPeriod | null>(null)
    const [periodLoading, setPeriodLoading] = useState(true)
    const [periodDrawerOpen, setPeriodDrawerOpen] = useState(false)
    const [openPeriodDrawer, setOpenPeriodDrawer] = useState(false)

    const loadPeriods = useCallback(async () => {
        setPeriodLoading(true)
        const [{ data: active }, { data: all }] = await Promise.all([
            payPeriodsService.getActive(),
            payPeriodsService.getAll(),
        ])
        const allList = all ?? []
        setActivePeriod(active ?? null)
        setAllPeriods(allList)
        setSelectedPeriod(prev => {
            if (prev) return allList.find(p => p.id === prev.id) ?? active ?? allList[0] ?? null
            return active ?? allList[0] ?? null
        })
        setPeriodLoading(false)
    }, [])

    useEffect(() => {
        loadPeriods()
    }, [loadPeriods])

    const isActivePeriod = selectedPeriod?.id === activePeriod?.id
    const closedPeriodsCount = allPeriods.filter(p => p.status === 'closed').length
    const initials = getInitials(user)
    const topBarSlotNode = useTopBarSlotNode()

    return (
        <>
            {topBarSlotNode && selectedPeriod && createPortal(
                <PeriodChip period={selectedPeriod} onClick={() => setPeriodDrawerOpen(true)} />,
                topBarSlotNode
            )}

            <header className="flex flex-col gap-[14px] px-5 pt-[22px] lg:px-0 lg:pt-0 bg-neutral-50 dark:bg-neutral-950 lg:hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/favicon.svg" alt="" className="w-6 h-6" />
                        <span className="text-[16px] font-semibold tracking-[-0.02em] text-ink">Mouny.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/accounts')}
                            className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink hover:bg-surface-hover transition-colors"
                            aria-label="Accounts"
                        >
                            <Coins className="w-4 h-4" />
                        </button>
                        <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center">
                            <span className="text-[11.5px] font-semibold text-[#fafafa]">{initials}</span>
                        </div>
                    </div>
                </div>
                {selectedPeriod && (
                    <div>
                        <PeriodChip period={selectedPeriod} onClick={() => setPeriodDrawerOpen(true)} />
                    </div>
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
                        setSelectedPeriod(period)
                        setPeriodDrawerOpen(false)
                    }}
                />

                <BottomDrawer open={openPeriodDrawer} onClose={() => setOpenPeriodDrawer(false)} title="Open New Period">
                    <OpenPeriodForm onSuccess={() => { setOpenPeriodDrawer(false); loadPeriods() }} />
                </BottomDrawer>
            </section>
        </>
    )
}