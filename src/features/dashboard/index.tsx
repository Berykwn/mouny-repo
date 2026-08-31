import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { OpenPeriodForm } from '@/features/periods/components/open-period-form'
import { PeriodChip } from '@/features/transactions/components/period-chip'
import { payPeriodsService } from '@/services/pay-periods.service'
import type { PayPeriod } from '@/types'
import { LoadingContent } from '@/components/loading-content'
import { Button } from '@/components/ui/button'
import { OverviewTransaction } from './components/overview/overview-tab'

export default function DashboardPage() {
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

    return (
        <>
            <header className="flex flex-col gap-[14px] px-5 pt-[22px] bg-neutral-50 dark:bg-neutral-950">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[20px] font-semibold tracking-[-0.02em]">Dashboard</span>
                    </div>
                    {selectedPeriod && (
                        <PeriodChip period={selectedPeriod} onClick={() => setPeriodDrawerOpen(true)} />
                    )}
                </div>
            </header>

            <section className="px-4 pb-4 pt-2.5 space-y-4">
                {periodLoading ? <LoadingContent /> : (
                    <>
                        {!selectedPeriod && (
                            <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-4 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-[#252525]">No active period</p>
                                    <p className="text-[11.5px] text-[#8a8a84] mt-0.5">
                                        Please open a new period first.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => setOpenPeriodDrawer(true)}
                                    size="sm"
                                    variant="outline"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Period
                                </Button>
                            </div>
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