import { formatShortCurrency } from '@/lib/helpers'
import type { RecurringBill } from '@/types'
import type { YearlyAhead } from '../lib/bills'
import { shortDate } from '../lib/bill-labels'

interface BillsYearlyProps {
    ahead: YearlyAhead[]
    onOpen: (bill: RecurringBill) => void
}

/** Yearly bills coming up, and what to put aside each month so none of them lands as a shock. */
export function BillsYearly({ ahead, onOpen }: BillsYearlyProps) {
    if (ahead.length === 0) return null
    const perMonth = ahead.reduce((s, a) => s + a.perMonth, 0)

    return (
        <div className="card overflow-hidden">
            <div className="flex items-baseline justify-between px-4 pt-4 pb-1">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Yearly bills</p>
                <p className="text-[10.5px] text-subtle-ink">next 12 months</p>
            </div>
            <p className="px-4 pb-2 text-[11.5px] text-muted-ink leading-relaxed">
                Put aside <span className="font-medium text-ink tabular-nums">{formatShortCurrency(Math.ceil(perMonth))}</span> a month to have them all ready.
            </p>
            <ol className="px-4 pb-3">
                {ahead.map(({ bill, date, perMonth: each, monthsLeft }) => {
                    const [day, month] = shortDate(date).split(' ')
                    return (
                        <li key={bill.id}>
                            <button
                                type="button"
                                onClick={() => onOpen(bill)}
                                className="w-full flex items-center gap-3 py-1.5 text-left rounded-[12px] hover:bg-surface-soft transition-colors"
                            >
                                <div className="w-11 h-11 rounded-[12px] flex flex-col items-center justify-center shrink-0 border leading-none bg-surface border-line text-ink">
                                    <span className="text-[15px] font-semibold tabular-nums">{day}</span>
                                    <span className="text-[9.5px] uppercase tracking-[.08em] mt-0.5">{month}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-medium text-ink truncate">{bill.name}</p>
                                    <p className="text-[10.5px] text-muted-ink">
                                        {monthsLeft === 1 ? 'This month' : `${formatShortCurrency(Math.ceil(each))}/month for ${monthsLeft} months`}
                                    </p>
                                </div>
                                <p className="text-[12.5px] font-medium tabular-nums text-ink shrink-0 pr-1">{formatShortCurrency(bill.amount)}</p>
                            </button>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
