import { useEffect, useState, useCallback } from 'react'
import { Plus, CalendarDays, CheckCircle, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { OpenPeriodForm } from '@/features/periods/components/open-period-form'
import { ClosePeriodForm } from '@/features/periods/components/close-period-form'
import { payPeriodsService } from '@/services/pay-periods.service'
import type { PayPeriod } from '@/types'
import { formatCurrency, formatDate, getDaysBetween } from '@/lib/helpers'
import { LoadingContent } from '@/components/loading-content'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { OverviewTransaction } from './components/overview/overview-tab'

export default function DashboardPage() {
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [allPeriods, setAllPeriods] = useState<PayPeriod[]>([])
    const [selectedPeriod, setSelectedPeriod] = useState<PayPeriod | null>(null)
    const [periodLoading, setPeriodLoading] = useState(true)
    const [periodCollapsed, setPeriodCollapsed] = useState(true)
    const [openPeriodDrawer, setOpenPeriodDrawer] = useState(false)
    const [closePeriodDrawer, setClosePeriodDrawer] = useState(false)

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

    const selectedIndex = allPeriods.findIndex(p => p.id === selectedPeriod?.id)
    const isActivePeriod = selectedPeriod?.id === activePeriod?.id
    const daysSince = getDaysBetween(selectedPeriod?.start_date)

    return (
        <div className="px-4 pb-4 space-y-4">
            {periodLoading ? <LoadingContent /> : (
                <>
                    {selectedPeriod ? (
                        <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden">
                            <button
                                onClick={() => setPeriodCollapsed(v => !v)}
                                className="w-full p-4 flex items-center gap-2.5 text-left"
                            >
                                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900 flex items-center justify-center shrink-0">
                                    <CalendarDays className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold">
                                        {isActivePeriod ? 'Active Period' : 'Past Period'}
                                    </p>
                                    <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-medium mt-0.5">
                                        {isActivePeriod ? 'Ongoing' : 'Closed'} · {formatDate(selectedPeriod.start_date)}
                                    </p>
                                </div>

                                {allPeriods.length > 1 && (
                                    <div
                                        className="flex items-center gap-0.5 mr-1"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <button
                                            disabled={selectedIndex >= allPeriods.length - 1}
                                            onClick={() => setSelectedPeriod(allPeriods[selectedIndex + 1])}
                                            className="p-1 disabled:opacity-30"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            disabled={selectedIndex <= 0}
                                            onClick={() => setSelectedPeriod(allPeriods[selectedIndex - 1])}
                                            className="p-1 disabled:opacity-30"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}

                                <ChevronDown className={cn(
                                    'w-4 h-4 text-muted-foreground transition-transform duration-200',
                                    !periodCollapsed && 'rotate-180'
                                )} />
                            </button>

                            {!periodCollapsed && (
                                <div className="px-4 pb-4 space-y-4">
                                    <div className="space-y-2 pt-1 border-t border-neutral-100">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Started</span>
                                            <span className="font-medium">{daysSince} days ago</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Expected income</span>
                                            <span className="font-medium">{formatCurrency(selectedPeriod.salary_amount)}</span>
                                        </div>
                                        {selectedPeriod.notes && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Notes</span>
                                                <span className="font-medium text-right max-w-[60%] truncate">{selectedPeriod.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                    {isActivePeriod && (
                                        <Button
                                            onClick={() => setClosePeriodDrawer(true)}
                                            className="w-full"
                                            variant="destructive"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Close Period
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-neutral-200 bg-card p-4 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">No active period</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
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
                            salaryAmount={selectedPeriod.salary_amount}
                            isActivePeriod={isActivePeriod}
                        />
                    )}
                </>
            )}

            <BottomDrawer open={openPeriodDrawer} onClose={() => setOpenPeriodDrawer(false)} title="Open New Period">
                <OpenPeriodForm onSuccess={() => { setOpenPeriodDrawer(false); loadPeriods() }} />
            </BottomDrawer>
            <BottomDrawer open={closePeriodDrawer} onClose={() => setClosePeriodDrawer(false)} title="Close Period">
                {activePeriod && (
                    <ClosePeriodForm
                        period={activePeriod}
                        onSuccess={() => { setClosePeriodDrawer(false); setActivePeriod(null); loadPeriods() }}
                    />
                )}
            </BottomDrawer>
        </div>
    )
}