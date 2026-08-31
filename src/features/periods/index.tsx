import { useEffect, useState, useCallback } from 'react'
import { Plus, CalendarDays, CheckCircle } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { OpenPeriodForm } from './components/open-period-form'
import { PeriodHistory } from './components/period-history'
import { ClosePeriodForm } from './components/close-period-form'
import { payPeriodsService } from '@/services/pay-periods.service'
import type { PayPeriod } from '@/types'
import { formatCurrency, formatDate, getDaysBetween } from '@/lib/helpers'
import { LoadingContent } from '@/components/loading-content'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'

export function PeriodHistoryPage() {
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [allPeriods, setAllPeriods] = useState<PayPeriod[]>([])
    const [loading, setLoading] = useState(true)
    const [openPeriodDrawer, setOpenPeriodDrawer] = useState(false)
    const [closePeriodDrawer, setClosePeriodDrawer] = useState(false)

    const daysSince = getDaysBetween(activePeriod?.start_date)

    const load = useCallback(async () => {
        setLoading(true)
        const [{ data: active }, { data: all }] = await Promise.all([
            payPeriodsService.getActive(),
            payPeriodsService.getAll(),
        ])
        setActivePeriod(active)
        setAllPeriods(all ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const closedPeriods = allPeriods.filter(p => p.status === 'closed')

    return (
        <>
            <PageHeader title="Period History" />
            <section className="px-4 pb-4 space-y-4">
                {loading ? <LoadingContent /> : (
                    <div className="space-y-4 lg:grid lg:grid-cols-[360px_1fr] lg:gap-4 lg:items-start lg:space-y-0">
                        {activePeriod ? (
                            <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-[10px] bg-[#f2f6ea] flex items-center justify-center shrink-0">
                                            <CalendarDays className="w-4 h-4 text-[#6FA82B]" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-semibold text-[#252525]">Active Period</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#6FA82B] animate-pulse" />
                                                <p className="text-[11px] text-[#6FA82B] font-medium">Ongoing</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-[#8a8a84]">{daysSince} days ago</span>
                                </div>

                                <div className="space-y-2 pt-1 border-t border-[#f2f2f0]">
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-[#8a8a84]">Start</span>
                                        <span className="font-medium text-[#252525]">{formatDate(activePeriod.start_date)}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-[#8a8a84]">Expected income</span>
                                        <span className="font-medium text-[#252525]">{formatCurrency(activePeriod.salary_amount)}</span>
                                    </div>
                                    {activePeriod.notes && (
                                        <div className="flex justify-between text-[13px]">
                                            <span className="text-[#8a8a84]">Notes</span>
                                            <span className="font-medium text-[#252525] text-right max-w-[60%] truncate">{activePeriod.notes}</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setClosePeriodDrawer(true)}
                                    className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#dc2626] hover:bg-[#dc2626]/90 transition-colors flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Close Period
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-4 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-[#252525]">No active period</p>
                                    <p className="text-[11.5px] text-[#8a8a84] mt-0.5">
                                        {closedPeriods.length > 0
                                            ? `${closedPeriods.length} closed period${closedPeriods.length > 1 ? 's' : ''} in history`
                                            : 'Start tracking your spending'}
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

                        {/* Period history — always shown if has data */}
                        <PeriodHistory periods={allPeriods} />
                    </div>
                )}

                {/* Drawers */}
                <BottomDrawer open={openPeriodDrawer} onClose={() => setOpenPeriodDrawer(false)} title="Open New Period">
                    <OpenPeriodForm onSuccess={() => { setOpenPeriodDrawer(false); load() }} />
                </BottomDrawer>
                <BottomDrawer open={closePeriodDrawer} onClose={() => setClosePeriodDrawer(false)} title="Close Period">
                    {activePeriod && (
                        <ClosePeriodForm
                            period={activePeriod}
                            onSuccess={() => { setClosePeriodDrawer(false); setActivePeriod(null); load() }}
                        />
                    )}
                </BottomDrawer>
            </section>
        </>
    )
}
