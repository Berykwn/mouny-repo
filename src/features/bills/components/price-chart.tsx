import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import type { BillPayment } from '../lib/bill-history'
import { shortDate } from '../lib/bill-labels'

const SHOWN = 6
const HEIGHT = 64

/**
 * The last few payments as bars from zero, each labelled, so a price rise shows at a
 * glance. Payments above the lowest one shown are cobalt; the rest stay neutral.
 */
export function PriceChart({ payments }: { payments: BillPayment[] }) {
    const shown = payments.slice(-SHOWN)
    if (shown.length < 2) return null
    const max = Math.max(...shown.map(p => p.amount))
    const min = Math.min(...shown.map(p => p.amount))

    return (
        <figure>
            <div className="flex items-end gap-[2px]" style={{ height: HEIGHT + 18 }} role="list" aria-label="Payments by date">
                {shown.map(p => {
                    const raised = p.amount > min
                    const label = `${shortDate(p.date)}: ${formatCurrency(p.amount)}`
                    return (
                        <div key={p.id} role="listitem" aria-label={label} title={label} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                            <span className="text-[10.5px] tabular-nums text-muted-ink group-hover:text-ink">{formatShortCurrency(p.amount)}</span>
                            <span
                                className="w-full max-w-[34px] rounded-t-[4px]"
                                style={{
                                    height: Math.max(3, Math.round((p.amount / max) * HEIGHT)),
                                    backgroundColor: raised ? 'var(--brand)' : 'var(--line-strong)',
                                }}
                            />
                        </div>
                    )
                })}
            </div>
            <div className="flex gap-[2px] border-t border-line mt-0 pt-1">
                {shown.map(p => (
                    <span key={p.id} className="flex-1 text-center text-[10.5px] text-subtle-ink tabular-nums">{shortDate(p.date)}</span>
                ))}
            </div>
        </figure>
    )
}
