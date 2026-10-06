import ChartIcon from '~icons/ph/chart-pie-slice-duotone'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import type { RecurringBill } from '@/types'
import type { BillCosts, BillShare } from '../lib/bills'

const SHOWN = 5

interface BillsBreakdownProps {
    costs: BillCosts
    shares: BillShare[]
    /** The open period's salary, to say how much of it bills take. */
    salary: number | null
    onOpen: (bill: RecurringBill) => void
}

/** What bills cost a month, how much of the salary that is, and which ones weigh most. */
export function BillsBreakdown({ costs, shares, salary, onOpen }: BillsBreakdownProps) {
    if (shares.length === 0) return null

    const salaryPct = salary && salary > 0 ? Math.round((costs.perMonth / salary) * 100) : null
    const shown = shares.slice(0, SHOWN)
    const rest = shares.slice(SHOWN)
    const restPerMonth = rest.reduce((s, r) => s + r.perMonth, 0)

    const detail = salaryPct === null
        ? `${formatShortCurrency(costs.perYear)} a year across ${costs.count} bill${costs.count === 1 ? '' : 's'}.`
        : salaryPct >= 50
            ? `${salaryPct}% of your salary is spoken for before you spend a thing. Worth a look at what can go.`
            : `${salaryPct}% of your salary, ${formatShortCurrency(costs.perYear)} a year.`

    return (
        <div className="card overflow-hidden">
            <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                <div className="w-10 h-10 rounded-[12px] bg-info/10 text-info flex items-center justify-center shrink-0">
                    <ChartIcon className="w-[22px] h-[22px]" />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Every month</p>
                    <p className="text-[15px] font-medium tracking-[-0.01em] text-ink mt-0.5 tabular-nums">
                        {formatCurrency(Math.round(costs.perMonth))}
                    </p>
                    <p className="text-[11.5px] text-muted-ink leading-relaxed mt-0.5">{detail}</p>
                </div>
            </div>

            {costs.subscriptionsPerYear > 0 && (
                <div className="mx-4 mb-3 rounded-[14px] bg-surface-soft border border-line-soft px-3 py-2.5 flex items-center justify-between gap-3">
                    <p className="text-[11.5px] text-muted-ink">Subscriptions over a year</p>
                    <p className="text-[13px] font-medium text-ink tabular-nums shrink-0">{formatCurrency(costs.subscriptionsPerYear)}</p>
                </div>
            )}

            <ol className="border-t border-line-soft divide-y divide-line-soft">
                {shown.map(({ bill, perMonth, share }) => (
                    <li key={bill.id}>
                        <button
                            type="button"
                            onClick={() => onOpen(bill)}
                            className="w-full px-4 py-2.5 text-left transition-colors hover:bg-surface-soft"
                        >
                            <div className="flex items-baseline justify-between gap-3">
                                <p className="text-[12.5px] font-medium text-ink truncate">{bill.name}</p>
                                <p className="text-[12.5px] font-medium tabular-nums text-ink shrink-0">
                                    {formatShortCurrency(Math.round(perMonth))}
                                    <span className="text-[10.5px] font-normal text-subtle-ink"> · {Math.round(share * 100)}%</span>
                                </p>
                            </div>
                            <div className="mt-1.5 h-1 rounded-full bg-line-soft overflow-hidden">
                                <div className="h-full rounded-full bg-info/70" style={{ width: `${Math.max(2, share * 100)}%` }} />
                            </div>
                        </button>
                    </li>
                ))}
                {rest.length > 0 && (
                    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <p className="text-[11.5px] text-muted-ink">{rest.length} more</p>
                        <p className="text-[12px] tabular-nums text-muted-ink">{formatShortCurrency(Math.round(restPerMonth))}</p>
                    </li>
                )}
            </ol>
        </div>
    )
}
