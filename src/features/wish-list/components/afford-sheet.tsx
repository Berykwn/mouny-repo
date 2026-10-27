import { useMemo, useState, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { useBills, usePeriods, usePeriodTransactions, useSavingsPace } from '@/queries'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { MIN_PROJECTION_DAYS, usePeriodStats } from '@/hooks/use-period-stats'
import { formatCurrency, formatCurrencyInput, getDaysBetween, parseCurrencyInput, toISODate } from '@/lib/helpers'
import { addDays } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { periodWindow } from '@/features/bills/lib/bills'
import { dayDate } from '@/features/bills/lib/bill-labels'
import { affordVerdict, aroundLabel, type AffordVerdict } from '../lib/afford'

const PRIMARY_BTN = 'flex-1 h-12 rounded-[14px] text-[13px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'
const SECONDARY_BTN = 'flex-1 h-12 rounded-[14px] text-[13px] font-semibold bg-surface-hover text-ink hover:bg-line-soft transition-colors disabled:opacity-50 disabled:pointer-events-none'

const NO_PERIOD = { start_date: '', end_date: null }

interface AffordSheetProps {
    /** Hands the amount and note over to the add-wish form. */
    onAddToWishlist: (name: string, amount: number) => void
    onClose: () => void
}

/** "Can I afford it?": one verdict, the reason behind it, and the other way to get it. */
export function AffordSheet({ onAddToWishlist, onClose }: AffordSheetProps) {
    const today = toISODate()
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')

    const { activePeriod, periods, isPending: periodsPending } = usePeriods()
    const { data: txs } = usePeriodTransactions(activePeriod?.id)
    const { data: bills } = useBills()
    const reserve = useBillReserve(activePeriod, txs)
    // Until both are in, bills still due would count as 0 and the verdict would be too generous.
    const loaded = !!txs && !!bills
    const pace = useSavingsPace()
    const window = useMemo(() => (activePeriod ? periodWindow(activePeriod, periods) : null), [activePeriod, periods])
    const stats = usePeriodStats({
        period: activePeriod ?? NO_PERIOD,
        transactions: txs ?? [],
        fallbackTotalDays: window?.estimated ? getDaysBetween(window.start, window.end) + 1 : null,
        reservedBills: reserve.reserved,
    })

    const value = parseCurrencyInput(amount)
    const payday = window ? addDays(window.end, 1) : null
    const verdict: AffordVerdict | null = value > 0
        ? affordVerdict({
            amount: value,
            safeToSpend: activePeriod && loaded ? stats.remaining : null,
            daysLeft: stats.daysRemaining !== null ? stats.daysRemaining + 1 : null,
            usualPerDay: stats.daysElapsed >= MIN_PROJECTION_DAYS && stats.dailyAvg > 0 ? stats.dailyAvg : null,
            pace,
            payday,
            today,
        })
        : null

    const view = verdict ? describe(verdict, today, periodsPending || (!!activePeriod && !loaded)) : null

    return (
        <div className="space-y-4 pb-2">
            <label className="flex items-baseline gap-2">
                <span className="text-[22px] font-medium text-muted-ink">Rp</span>
                <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    aria-label="Amount"
                    placeholder="0"
                    value={formatCurrencyInput(amount)}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    className="min-w-0 flex-1 bg-transparent text-[40px] font-semibold tracking-[-0.03em] text-ink tabular-nums outline-none placeholder:text-faint-ink"
                />
            </label>
            <Input
                aria-label="What is it? (optional)"
                placeholder="What is it? (optional)"

                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={80}
                className="h-12 rounded-[14px] border-line bg-surface-hover text-[16px] lg:text-[14px]"
            />

            {view && (
                <div className={cn('rounded-[20px] px-4 py-3.5', view.tone)}>
                    <p className={cn('text-[18px] font-semibold tracking-[-0.01em]', view.titleTone)}>{view.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-ink [&_b]:font-semibold [&_b]:text-ink">{view.reason}</p>
                </div>
            )}
            {view?.alternative && <p className="text-[12.5px] text-muted-ink [&_b]:font-semibold [&_b]:text-ink">{view.alternative}</p>}

            <p className="text-[11.5px] text-subtle-ink leading-relaxed">
                Judged against what’s safe to spend now, with bills still due held back
                {pace ? `, and what your last ${pace.basedOn} closed period${pace.basedOn === 1 ? '' : 's'} usually left over` : ''}.
            </p>

            <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className={SECONDARY_BTN}>Close</button>
                <button
                    type="button"
                    disabled={value <= 0 || !activePeriod}
                    onClick={() => onAddToWishlist(note.trim(), value)}
                    className={PRIMARY_BTN}
                >
                    Add to Wishlist
                </button>
            </div>
        </div>
    )
}

function describe(v: AffordVerdict, today: string, loading: boolean): { title: string; reason: ReactNode; alternative: ReactNode | null; tone: string; titleTone: string } {
    const around = (date: string | null) => (date ? <>Or save for it: ready around <b>{aroundLabel(date, today)}</b>.</> : null)
    switch (v.kind) {
        case 'yes':
            return {
                title: 'Yes, you can',
                reason: v.daysLeft
                    ? <>After buying it you’d still have <b>{formatCurrency(Math.floor(v.perDayAfter))} a day</b> until payday.</>
                    : <>It fits in what’s safe to spend, with <b>{formatCurrency(Math.floor(v.perDayAfter))}</b> left after.</>,
                alternative: null,
                tone: 'bg-brand-tint',
                titleTone: 'text-brand-ink',
            }
        case 'tight':
            return {
                title: 'Tight, but possible',
                reason: <>Buying today leaves <b>{formatCurrency(Math.floor(v.perDayAfter))} a day</b> for the next {v.daysLeft} day{v.daysLeft === 1 ? '' : 's'}, less than the {formatCurrency(Math.round(v.usualPerDay))} you usually spend.</>,
                alternative: around(v.readyAround),
                tone: 'bg-warning-soft',
                titleTone: 'text-warning-ink',
            }
        case 'after-payday':
            return {
                title: 'Better after payday',
                reason: <>
                    It’s <b>{formatCurrency(v.short)}</b> more than is safe to spend before payday{v.payday ? ` (${dayDate(v.payday)})` : ''}.
                    {' '}Your periods usually leave about <b>{formatCurrency(Math.round(v.leftover))}</b> over, which covers it.
                </>,
                alternative: around(v.readyAround),
                tone: 'bg-brand-tint',
                titleTone: 'text-brand-ink',
            }
        case 'save':
            return {
                title: 'Save for it first',
                reason: <>It’s <b>{formatCurrency(v.short)}</b> more than is safe to spend now, and more than a period usually leaves over.</>,
                alternative: v.readyAround
                    ? <>At your usual leftover it’s ready around <b>{aroundLabel(v.readyAround, today)}</b>.</>
                    : <>A save-up date appears once you’ve closed a period with money left over.</>,
                tone: 'bg-surface-hover',
                titleTone: 'text-ink',
            }
        case 'unknown':
            return {
                title: 'Can’t tell yet',
                reason: loading
                    ? <>Still loading your bills and this period’s spending. The answer shows once they’re in.</>
                    : <>Open a pay period, and this checks the amount against what’s safe to spend in it.</>,
                alternative: null,
                tone: 'bg-surface-hover',
                titleTone: 'text-ink',
            }
    }
}
