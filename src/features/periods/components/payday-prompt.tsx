import { lazy, Suspense, useState, useSyncExternalStore } from 'react'
import { Banknote } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { usePeriods } from '@/queries'
import { formatDateShort, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { paydayDue, paydaySnoozed, snoozePayday } from '../lib/payday'

// The prompt sits in the sidebar on every page; the forms (calendar, recap) load when it's used.
const ClosePeriodForm = lazy(() => import('./close-period-form').then(m => ({ default: m.ClosePeriodForm })))
const OpenPeriodForm = lazy(() => import('./open-period-form').then(m => ({ default: m.OpenPeriodForm })))

// "Not paid yet" hides every prompt on screen at once (the sidebar's and the page's).
const snoozeListeners = new Set<() => void>()
let snoozeVersion = 0
const subscribeSnooze = (fn: () => void) => {
    snoozeListeners.add(fn)
    return () => { snoozeListeners.delete(fn) }
}
const getSnoozeVersion = () => snoozeVersion

type Step = 'close' | 'open' | null

interface PaydayPromptProps {
    /** `card` for a page (Home, Periods); `compact` for the desktop sidebar under the period card. */
    variant?: 'card' | 'compact'
    className?: string
}

/**
 * "Got paid? Start the November period": shown once payday has come for the running period
 * (the day Plan's "Next period about …" starts), so the period doesn't run on as "day 31"
 * with today's entries landing in last month. It opens the close-then-open flow and says,
 * before anything happens, exactly what closing does; "Not paid yet" puts it off until tomorrow.
 */
export function PaydayPrompt({ variant = 'card', className }: PaydayPromptProps) {
    const { periods, activePeriod } = usePeriods()
    const [step, setStep] = useState<Step>(null)
    // The names stay put through the flow, though the period they come from closes halfway.
    const [names, setNames] = useState<{ current: string; next: string } | null>(null)
    useSyncExternalStore(subscribeSnooze, getSnoozeVersion)

    const today = toISODate()
    const due = paydayDue(activePeriod, periods, today)
    const visible = !!due && !!activePeriod && !paydaySnoozed(activePeriod.id, today)

    const start = () => {
        if (!due) return
        setNames({ current: due.current, next: due.next })
        setStep('close')
    }
    const notYet = () => {
        if (!activePeriod) return
        snoozePayday(activePeriod.id, today)
        snoozeVersion++
        snoozeListeners.forEach(fn => fn())
    }

    const sinceWhen = due && (due.daysLate === 0 ? 'Payday is today' : `Payday was due ${formatDateShort(due.expected)}`)

    return (
        <>
            {visible && due && (variant === 'compact' ? (
                <div className={cn('rounded-[12px] border border-line p-3', className)}>
                    <p className="text-[13px] font-semibold text-ink">Got paid?</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-subtle-ink">{sinceWhen}, going by your last period.</p>
                    <button
                        type="button"
                        onClick={start}
                        className="mt-2.5 w-full h-9 rounded-[10px] bg-action text-on-action text-[13px] font-semibold hover:bg-action/90 transition-colors"
                    >
                        Start the {due.next} period
                    </button>
                    <button type="button" onClick={notYet} className="mt-1 w-full h-8 text-[12.5px] font-medium text-muted-ink hover:text-ink transition-colors">
                        Not paid yet
                    </button>
                </div>
            ) : (
                <section aria-label="Payday" className={cn('rounded-[18px] bg-brand-tint p-4', className)}>
                    <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shrink-0 text-brand">
                            <Banknote aria-hidden="true" className="w-[18px] h-[18px]" strokeWidth={1.9} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[15.5px] font-semibold text-ink">Got paid? Start the {due.next} period</p>
                            <p className="mt-0.5 text-[13.5px] leading-snug text-muted-ink">
                                {sinceWhen}, going by your last period. Until you start {due.next}, new entries still go into {due.current}.
                            </p>
                        </div>
                    </div>
                    <div className="mt-3.5 grid grid-cols-[1fr_auto] gap-2">
                        <button
                            type="button"
                            onClick={start}
                            className="h-11 rounded-[12px] bg-action text-on-action text-[14px] font-semibold hover:bg-action/90 transition-colors"
                        >
                            Start {due.next}
                        </button>
                        <button
                            type="button"
                            onClick={notYet}
                            className="h-11 px-4 rounded-[12px] bg-surface text-[14px] font-semibold text-ink hover:bg-surface-hover transition-colors"
                        >
                            Not paid yet
                        </button>
                    </div>
                </section>
            ))}

            <BottomDrawer
                open={step === 'close'}
                onClose={() => setStep(null)}
                title={names ? `Close ${names.current}, start ${names.next}` : 'Close period'}
            >
                {step === 'close' && activePeriod && names && (
                    <div className="space-y-5">
                        <WhatHappens current={names.current} next={names.next} />
                        <Suspense fallback={null}>
                            <ClosePeriodForm
                                period={activePeriod}
                                onSuccess={() => setStep(null)}
                                onClosed={openNext => { if (openNext) setStep('open') }}
                            />
                        </Suspense>
                    </div>
                )}
            </BottomDrawer>
            <BottomDrawer
                open={step === 'open'}
                onClose={() => setStep(null)}
                title={names ? `Open the ${names.next} period` : 'Open a period'}
            >
                {step === 'open' && (
                    <Suspense fallback={null}>
                        <OpenPeriodForm onSuccess={() => setStep(null)} />
                    </Suspense>
                )}
            </BottomDrawer>
        </>
    )
}

/** Closing can't be undone, so the sheet says what it does before the button does it. */
export function WhatHappens({ current, next }: { current: string; next: string }) {
    const lines: [string, string][] = [
        [`${current} closes for good.`, `It ends on the closing date below (today unless you change it). Its numbers and the balance across your accounts are kept as they are, and it can’t be reopened.`],
        [`Then you open ${next}.`, 'Pick the pay date, how much came in and the account it landed in. Leave “Open the next period right away” on and it comes up next.'],
        [`New entries go into ${next}.`, `What’s already in ${current} stays there.`],
    ]
    return (
        <div className="rounded-[14px] bg-line-soft p-3.5">
            <p className="text-[13px] font-semibold text-ink">What happens</p>
            <ol className="mt-2 space-y-2">
                {lines.map(([head, body], i) => (
                    <li key={head} className="flex gap-2.5 text-[13.5px] leading-snug">
                        <span className="w-5 h-5 rounded-full bg-surface text-[11.5px] font-semibold text-ink flex items-center justify-center shrink-0 tabular-nums">{i + 1}</span>
                        <span className="text-muted-ink"><b className="font-semibold text-ink">{head}</b> {body}</span>
                    </li>
                ))}
            </ol>
            <p className="mt-2.5 text-[12.5px] text-subtle-ink">Not paid yet? Leave it; {current} keeps running.</p>
        </div>
    )
}
