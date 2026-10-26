import { useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { PageHeader } from '@/components/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { PeriodChip } from '@/features/transactions/components/period-chip'
import { useSelectedPeriod } from '@/stores/period-store'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { useInsightsData } from './hooks/use-insights-data'
import { ThisPeriodTab } from './components/this-period-tab'
import { HabitsTab } from './components/habits-tab'
import { CashFlowTab } from './components/cash-flow-tab'
import { TrendsTab } from './components/trends-tab'
import { WhatIfTab } from './components/what-if-tab'

const TABS = [
    { id: 'period', label: 'This period' },
    { id: 'habits', label: 'Habits' },
    { id: 'cash-flow', label: 'Cash flow' },
    { id: 'trends', label: 'Trends' },
    { id: 'what-if', label: 'What if' },
] as const

type TabId = typeof TABS[number]['id']

const tabId = (tab: TabId) => `insights-tab-${tab}`
const PANEL_ID = 'insights-panel'

/** Everything that explains a period, each block opening with one sentence. */
export default function InsightsPage() {
    const { periods, activePeriod, selectedPeriod, isActivePeriod, isPending, selectPeriod } = useSelectedPeriod()
    const [pickerOpen, setPickerOpen] = useState(false)
    const topBarSlotNode = useTopBarSlotNode()
    // The tab lives in the URL, so Home can link straight to the cash flow.
    const [params, setParams] = useSearchParams()
    const tab: TabId = TABS.some(t => t.id === params.get('tab')) ? params.get('tab') as TabId : 'period'
    const setTab = (next: TabId) => setParams(p => {
        const out = new URLSearchParams(p)
        if (next === 'period') out.delete('tab')
        else out.set('tab', next)
        return out
    }, { replace: true })

    const chip = selectedPeriod && <PeriodChip period={selectedPeriod} onClick={() => setPickerOpen(true)} />

    return (
        <>
            {topBarSlotNode && chip && createPortal(chip, topBarSlotNode)}
            <PageHeader title="Insights" action={chip} />

            <section className="px-4 pb-6 lg:px-0">
                <InsightsTabs tab={tab} onChange={setTab} />
                <div id={PANEL_ID} role="tabpanel" aria-labelledby={tabId(tab)} className="lg:pt-4">
                    {isPending ? <InsightsSkeleton /> : selectedPeriod ? (
                        <InsightsBody periodId={selectedPeriod.id} isActivePeriod={isActivePeriod} tab={tab} onOpenWhatIf={() => setTab('what-if')} />
                    ) : (
                        <div className="py-6">
                            <p className="text-[15px] font-semibold text-ink">Nothing to analyse yet</p>
                            <p className="mt-1 text-[13px] text-muted-ink leading-relaxed">
                                Insights appear once a pay period has a few transactions in it.
                            </p>
                        </div>
                    )}
                </div>
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

/** Underlined tabs that scroll sideways on a narrow phone; arrow keys move between them. */
function InsightsTabs({ tab, onChange }: { tab: TabId; onChange: (tab: TabId) => void }) {
    const refs = useRef<(HTMLButtonElement | null)[]>([])
    const onKeyDown = (e: KeyboardEvent, index: number) => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
        if (!step) return
        e.preventDefault()
        const next = (index + step + TABS.length) % TABS.length
        onChange(TABS[next].id)
        refs.current[next]?.focus()
    }
    return (
        <div role="tablist" aria-label="Insights" className="-mx-4 px-4 lg:mx-0 lg:px-0 flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:none]">
            {TABS.map((t, i) => {
                const selected = t.id === tab
                return (
                    <button
                        key={t.id}
                        ref={el => { refs.current[i] = el }}
                        id={tabId(t.id)}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls={PANEL_ID}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => onChange(t.id)}
                        onKeyDown={e => onKeyDown(e, i)}
                        className={cn(
                            '-mb-px shrink-0 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-[15px] font-semibold transition-colors',
                            selected ? 'border-ink text-ink' : 'border-transparent text-muted-ink hover:text-ink'
                        )}
                    >
                        {t.label}
                    </button>
                )
            })}
        </div>
    )
}

function InsightsBody({ periodId, isActivePeriod, tab, onOpenWhatIf }: { periodId: string; isActivePeriod: boolean; tab: TabId; onOpenWhatIf: () => void }) {
    const { data, loading, retry, stats, comparable, history, outlook, trend } = useInsightsData(periodId)

    if (loading) return <InsightsSkeleton />
    if (!data) return (
        <section role="alert" className="card mt-4 p-4 flex items-center justify-between gap-3">
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

    switch (tab) {
        case 'habits':
            return <HabitsTab transactions={data.transactions} history={history} />
        case 'cash-flow':
            return <CashFlowTab transactions={data.transactions} stats={stats} outlook={outlook} isActivePeriod={isActivePeriod} onOpenWhatIf={onOpenWhatIf} />
        case 'trends':
            return <TrendsTab period={data.period} periods={data.allPeriods} stats={stats} trend={trend} totalBalance={data.totalBalance} />
        case 'what-if':
            return <WhatIfTab stats={stats} transactions={data.transactions} />
        default:
            return <div className="pt-4 lg:pt-0"><ThisPeriodTab data={data} stats={stats} comparable={comparable} history={history} /></div>
    }
}

function InsightsSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading insights" className="pt-6 space-y-6 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {[0, 1].map(i => (
                <div key={i} className="lg:rounded-[20px] lg:border lg:border-line lg:bg-surface lg:p-6">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-3 h-5 w-5/6" />
                    <Skeleton className="mt-2 h-5 w-2/3" />
                    <Skeleton className="mt-5 h-[180px] w-full rounded-[14px]" />
                </div>
            ))}
        </div>
    )
}
