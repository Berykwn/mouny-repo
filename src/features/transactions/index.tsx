import { useEffect, useState, useCallback } from 'react'
import { BarChart2, CalendarDays } from 'lucide-react'
import { useSwipeable } from 'react-swipeable'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { TransactionForm } from './components/transaction-form'
import { PeriodAnalytics } from './components/period-analytics'
import { PeriodCalendar } from './components/period-calendar'
import { transactionsService } from '@/services/transactions.service'
import { payPeriodsService } from '@/services/pay-periods.service'
import { formatDate, toISODate } from '@/lib/helpers'
import type { TransactionWithDetails, PayPeriod } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingContent } from '@/components/loading-content'
import NoPeriod from '@/components/no-period'

const TABS = ['calendar', 'analytics'] as const
type Tab = typeof TABS[number]

export default function TransactionsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('calendar')
    const [allPeriods, setAllPeriods] = useState<PayPeriod[]>([])
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(0)
    const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
    const [loading, setLoading] = useState(true)
    const [txLoading, setTxLoading] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [periodPickerOpen, setPeriodPickerOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [selectedDate, setSelectedDate] = useState<string>(toISODate())

    const today = toISODate()

    const selectedPeriod = allPeriods[selectedPeriodIndex] ?? null
    const isCurrentPeriod = selectedPeriod?.id === activePeriod?.id
    const canGoPrev = selectedPeriodIndex < allPeriods.length - 1
    const canGoNext = selectedPeriodIndex > 0

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => {
            const i = TABS.indexOf(activeTab)
            if (i < TABS.length - 1) setActiveTab(TABS[i + 1])
        },
        onSwipedRight: () => {
            const i = TABS.indexOf(activeTab)
            if (i > 0) setActiveTab(TABS[i - 1])
        },
        preventScrollOnSwipe: true,
        trackMouse: false,
        delta: 50,
    })

    const init = useCallback(async () => {
        setLoading(true)
        const [{ data: active }, { data: all }] = await Promise.all([
            payPeriodsService.getActive(),
            payPeriodsService.getAll(),
        ])
        setActivePeriod(active)

        const periods = all ?? []
        setAllPeriods(periods)

        const defaultIndex = active ? periods.findIndex(p => p.id === active.id) : 0
        const idx = defaultIndex >= 0 ? defaultIndex : 0
        setSelectedPeriodIndex(idx)

        const defaultPeriod = periods[idx] ?? null
        if (defaultPeriod) {
            const { data: txs } = await transactionsService.getByPeriod(defaultPeriod.id)
            setTransactions(txs ?? [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { init() }, [init])

    const loadTransactions = useCallback(async (period: PayPeriod) => {
        setTxLoading(true)
        const { data: txs } = await transactionsService.getByPeriod(period.id)
        setTransactions(txs ?? [])
        setTxLoading(false)
    }, [])

    const handlePrevPeriod = () => {
        const next = selectedPeriodIndex + 1
        if (next >= allPeriods.length) return
        setSelectedPeriodIndex(next)
        loadTransactions(allPeriods[next])
    }

    const handleNextPeriod = () => {
        const next = selectedPeriodIndex - 1
        if (next < 0) return
        setSelectedPeriodIndex(next)
        loadTransactions(allPeriods[next])
    }

    const handleDeleteConfirm = async () => {
        if (!deletingId) return
        setDeleteLoading(true)
        const { error } = await transactionsService.remove(deletingId)
        setDeleteLoading(false)
        if (error) { toast.error(error); return }
        setTransactions(prev => prev.filter(t => t.id !== deletingId))
        setDeletingId(null)
        toast.success('Transaction deleted.')
    }

    const periodLabel = (p: PayPeriod) => {
        const start = formatDate(p.start_date)
        const end = p.end_date ? formatDate(p.end_date) : 'ongoing'
        return `${start} — ${end}`
    }

    const calendarDefaultDate = isCurrentPeriod ? today : selectedPeriod?.start_date

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
            {loading ? (
                <LoadingContent />
            ) : !selectedPeriod ? (
                <NoPeriod />
            ) : (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="w-full">
                    <TabsList variant="default" className="w-full">
                        <TabsTrigger value="calendar">
                            <CalendarDays />
                            Calendar
                        </TabsTrigger>
                        <TabsTrigger value="analytics">
                            <BarChart2 />
                            Analytics
                        </TabsTrigger>
                    </TabsList>

                    {txLoading ? (
                        <LoadingContent />
                    ) : (
                        <section {...swipeHandlers}>
                            <TabsContent value="calendar">
                                <PeriodCalendar
                                    transactions={transactions}
                                    periodStart={selectedPeriod.start_date}
                                    periodEnd={selectedPeriod.end_date ?? today}
                                    defaultDate={calendarDefaultDate}
                                    onDeleteRequest={isCurrentPeriod ? setDeletingId : undefined}
                                    readOnly={!isCurrentPeriod}
                                    periodLabel={periodLabel(selectedPeriod)}
                                    isCurrentPeriod={isCurrentPeriod}
                                    canGoPrev={canGoPrev}
                                    canGoNext={canGoNext}
                                    onPrevPeriod={handlePrevPeriod}
                                    onNextPeriod={handleNextPeriod}
                                    onOpenPicker={() => setPeriodPickerOpen(true)}
                                    onDateSelect={setSelectedDate}
                                    onAddTransaction={isCurrentPeriod ? () => setDrawerOpen(true) : undefined}
                                />
                            </TabsContent>
                            <TabsContent value="analytics">
                                <PeriodAnalytics
                                    transactions={transactions}
                                    period={selectedPeriod}
                                />
                            </TabsContent>
                        </section>
                    )}
                </Tabs>
            )}

            <BottomDrawer
                open={periodPickerOpen}
                onClose={() => setPeriodPickerOpen(false)}
                title="Select Period"
            >
                <section className="space-y-1.5 pb-2">
                    {allPeriods.map((period, idx) => {
                        const isActive = period.id === activePeriod?.id
                        const isSelected = idx === selectedPeriodIndex
                        return (
                            <button
                                key={period.id}
                                onClick={() => {
                                    setSelectedPeriodIndex(idx)
                                    setPeriodPickerOpen(false)
                                    loadTransactions(period)
                                }}
                                className={cn(
                                    'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors',
                                    isSelected
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'bg-card hover:bg-accent'
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className={cn(
                                        'w-2 h-2 rounded-full shrink-0',
                                        isActive
                                            ? 'bg-green-500'
                                            : isSelected ? 'bg-background' : 'bg-muted-foreground'
                                    )} />
                                    <div>
                                        <p className="text-sm font-medium">
                                            {isActive ? 'Current period' : formatDate(period.start_date)}
                                        </p>
                                        <p className={cn(
                                            'text-xs',
                                            isSelected ? 'text-background/70' : 'text-muted-foreground'
                                        )}>
                                            {periodLabel(period)} · {period.status}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </section>
            </BottomDrawer>

            {isCurrentPeriod && activePeriod && (
                <BottomDrawer
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    title="Add Transaction"
                >
                    <TransactionForm
                        payPeriodId={activePeriod.id}
                        periodStart={activePeriod.start_date}
                        periodEnd={undefined}
                        defaultDate={selectedDate}
                        onSuccess={() => {
                            setDrawerOpen(false)
                            loadTransactions(activePeriod)
                        }}
                    />
                </BottomDrawer>
            )}

            <ConfirmDrawer
                open={!!deletingId}
                title="Delete Transaction"
                description="Delete this transaction? This will also update your account balance."
                confirmLabel="Delete"
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                onClose={() => setDeletingId(null)}
            />
        </div>
    )
}