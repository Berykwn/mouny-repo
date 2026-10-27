import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, Loader2 } from 'lucide-react'

import { Calendar } from '@/components/ui/calendar'
import { Switch } from '@/components/ui/switch'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { payPeriodsService } from '@/services/pay-periods.service'
import { accountsService } from '@/services/accounts-categories.service'
import { useAccounts, usePeriods, usePeriodTransactions, useTransactionsOfPeriods } from '@/queries'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { OFFLINE_REASON } from '@/components/offline-banner'
import { formatCurrency, formatShortCurrency, toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import type { PayPeriod } from '@/types'
import { periodRecap, RECAP_PERIODS } from '../lib/period-recap'

interface ClosePeriodFormProps {
    period: PayPeriod
    /** Called once the period is closed. */
    onSuccess: () => void
    /** Called with whether the user asked to open the next period straight away. */
    onClosed?: (openNext: boolean) => void
}

const LINE = 'flex items-center justify-between gap-3 py-3 border-b border-line-soft text-[14.5px]'

/**
 * Closing a period: an automatic recap first (what was kept against the usual, what stood
 * out), then one button. Opening the next period is offered right after, never assumed.
 */
export function ClosePeriodForm({ period, onSuccess, onClosed }: ClosePeriodFormProps) {
    const [endDate, setEndDate] = useState<Date | undefined>(new Date())
    const [dateOpen, setDateOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [openNext, setOpenNext] = useState(true)
    const online = useOnlineStatus()

    const { periods } = usePeriods()
    const { data: periodTxs } = usePeriodTransactions(period.id)
    const { data: accounts } = useAccounts()
    const historyIds = useMemo(() => periods
        .filter(p => p.status === 'closed' && p.start_date < period.start_date)
        .sort((a, b) => b.start_date.localeCompare(a.start_date))
        .slice(0, RECAP_PERIODS)
        .map(p => p.id), [periods, period.start_date])
    const history = useTransactionsOfPeriods(historyIds)
    const recap = useMemo(
        () => periodTxs ? periodRecap(periodTxs, history ?? []) : null,
        [periodTxs, history],
    )
    const balance = accounts?.reduce((s, a) => s + a.balance, 0) ?? null

    // Bare YYYY-MM-DD parses as UTC midnight; compare against local midnight like the calendar does.
    const periodStart = new Date(period.start_date + 'T00:00:00')
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const handleClose = async () => {
        if (!online) { toast(OFFLINE_REASON); return }
        const closeDate = toISODate(endDate ?? new Date())
        if (closeDate < period.start_date) {
            toast.error('Closing date cannot be before the period start.')
            return
        }
        if (closeDate > toISODate()) {
            toast.error('Closing date cannot be in the future.')
            return
        }

        setLoading(true)

        // Fresh from the server, not the cache: the closing balance is stored for good.
        const { data: fresh, error: accountsError } = await accountsService.getAll()
        if (accountsError) {
            setLoading(false)
            toast.error(accountsError)
            return
        }
        const closingBalance = (fresh ?? []).reduce((s, a) => s + a.balance, 0)

        const { error } = await payPeriodsService.close(
            period.id,
            closingBalance,
            closeDate
        )

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success('Period closed. Nicely done.')
        onSuccess()
        onClosed?.(openNext)
    }

    const up = recap?.changes.find(c => c.pct > 0)
    const down = recap?.changes.find(c => c.pct < 0)
    const vsMedian = recap?.keptPct !== null && recap?.medianPct != null ? recap.keptPct! - Math.round(recap.medianPct) : null

    return (
        <div className="flex flex-col gap-5 pb-2">
            {/* Kept, and against the usual */}
            <div className="grid grid-cols-2 rounded-[14px] border border-line overflow-hidden divide-x divide-line">
                <div className="p-3.5">
                    <p className="text-[13px] text-subtle-ink">Kept</p>
                    {recap ? (
                        <>
                            <p className={cn('mt-0.5 text-[22px] font-semibold tabular-nums leading-tight', recap.kept >= 0 ? 'text-brand-ink' : 'text-negative')}>
                                {recap.kept.toLocaleString('id-ID')}
                            </p>
                            <p className="text-[13px] font-medium text-subtle-ink">
                                {recap.keptPct !== null ? `${recap.keptPct}% of income` : 'No income recorded'}
                            </p>
                        </>
                    ) : <p className="mt-1 h-7 w-24 rounded bg-line-soft animate-pulse" />}
                </div>
                <div className="p-3.5">
                    <p className="text-[13px] text-subtle-ink">vs your median</p>
                    {vsMedian !== null ? (
                        <>
                            <p className="mt-0.5 text-[22px] font-semibold tabular-nums leading-tight text-ink">
                                {vsMedian > 0 ? '+' : vsMedian < 0 ? '−' : '±'}{Math.abs(vsMedian)} pts
                            </p>
                            <p className="text-[13px] font-medium text-subtle-ink">median {Math.round(recap!.medianPct!)}%</p>
                        </>
                    ) : (
                        <p className="mt-1 text-[13px] leading-snug text-subtle-ink">Shows after two closed periods.</p>
                    )}
                </div>
            </div>

            {recap && (up || down || recap.biggest) && (
                <div>
                    <h3 className="text-[16px] font-semibold text-ink">What stood out</h3>
                    <div className="mt-1">
                        {[up, down].map(c => c && (
                            <div key={c.categoryId} className={LINE}>
                                <span className="text-muted-ink truncate">{c.name}</span>
                                <span className={cn('shrink-0 tabular-nums', c.pct > 0 ? 'text-negative' : 'text-brand-ink')}>
                                    {c.pct > 0 ? '+' : '−'}{Math.abs(c.pct)}% vs usual
                                </span>
                            </div>
                        ))}
                        {recap.biggest && (
                            <div className={LINE}>
                                <span className="text-muted-ink shrink-0">Biggest one-off</span>
                                <span className="text-ink truncate text-right">
                                    {recap.biggest.note || recap.biggest.category?.name || 'Expense'} · {formatShortCurrency(recap.biggest.amount)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div>
                {balance !== null && (
                    <div className={LINE}>
                        <span className="text-muted-ink">Closing balance</span>
                        <span className="text-ink tabular-nums">{formatCurrency(balance)}</span>
                    </div>
                )}
                <div className={LINE}>
                    <span className="text-muted-ink">Closing date</span>
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger asChild>
                            <button type="button" className="flex items-center gap-1 text-ink hover:text-brand-ink transition-colors">
                                {endDate && toISODate(endDate) !== toISODate() ? format(endDate, 'EEE d MMM') : 'Today'}
                                <ChevronDown className="w-4 h-4 text-subtle-ink" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-[14px] border-line" align="end">
                            <Calendar
                                mode="single"
                                selected={endDate}
                                onSelect={(date) => {
                                    setEndDate(date)
                                    setDateOpen(false)
                                }}
                                disabled={(date) => date < periodStart || date > today}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <label className={cn(LINE, 'cursor-pointer')}>
                    <span className="min-w-0">
                        <span className="block text-ink">Open the next period right away</span>
                        <span className="block text-[13px] text-subtle-ink">You’ll set the pay date and amount next</span>
                    </span>
                    <Switch checked={openNext} onCheckedChange={setOpenNext} className="data-[state=checked]:bg-brand" />
                </label>
            </div>

            <div className="space-y-2">
                <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    title={online ? undefined : OFFLINE_REASON}
                    className={cn(
                        'w-full h-12 rounded-[14px] text-[15px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors disabled:opacity-50 disabled:pointer-events-none',
                        !online && 'opacity-50',
                    )}
                >
                    {loading
                        ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        : openNext ? 'Close & open the next one' : 'Close period'}
                </button>
                <p className="text-center text-[12.5px] text-subtle-ink">
                    {online ? 'A closed period can’t be reopened.' : OFFLINE_REASON}
                </p>
            </div>
        </div>
    )
}
