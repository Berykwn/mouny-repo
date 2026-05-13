import { useEffect, useState, useCallback } from 'react'
import { Plus, CalendarDays, CheckCircle } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { OpenPeriodForm } from './open-period-form'
import { PeriodHistory } from './period-history'
import { ClosePeriodForm } from './close-period-form'
import { payPeriodsService } from '@/services/pay-periods.service'
import type { PayPeriod } from '@/types'
import { formatCurrency, formatDate, getDaysBetween } from '@/lib/helpers'
import { LoadingContent } from '@/components/loading-content'
import { Button } from '@/components/ui/button'

export function PeriodTab() {
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
        <div className="space-y-3 mt-1.5">
            {loading ? <LoadingContent /> : (
                <>
                    {activePeriod ? (
                        /* Active period card */
                        <div className="rounded-2xl border border-neutral-200 bg-card p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-lime-100 dark:bg-lime-900 flex items-center justify-center shrink-0">
                                        <CalendarDays className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">Active Period</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
                                            <p className="text-[10px] text-lime-600 dark:text-lime-400 font-medium">Ongoing</p>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground">{daysSince} days ago</span>
                            </div>

                            <div className="space-y-2 pt-1 border-t border-neutral-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Start</span>
                                    <span className="font-medium">{formatDate(activePeriod.start_date)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Expected income</span>
                                    <span className="font-medium">{formatCurrency(activePeriod.salary_amount)}</span>
                                </div>
                                {activePeriod.notes && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Notes</span>
                                        <span className="font-medium text-right max-w-[60%] truncate">{activePeriod.notes}</span>
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={() => setClosePeriodDrawer(true)}
                                className="w-full"
                                variant='destructive'
                            >
                                <CheckCircle className="w-4 h-4" />
                                Close Period
                            </Button>
                        </div>
                    ) : (
                        /* No active period — CTA card */
                        <div className="rounded-2xl border border-neutral-200 bg-card p-4 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">No active period</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {closedPeriods.length > 0
                                        ? `${closedPeriods.length} closed period${closedPeriods.length > 1 ? 's' : ''} in history`
                                        : 'Start tracking your spending'}
                                </p>
                            </div>
                            <Button
                                onClick={() => setOpenPeriodDrawer(true)}
                                variant='outline'
                                className='font-bold'
                            >
                                <Plus className="w-4 h-4" /> Period
                            </Button>
                        </div>
                    )}

                    {/* Period history — always shown if has data */}
                    <PeriodHistory periods={allPeriods} />
                </>
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
        </div>
    )
}