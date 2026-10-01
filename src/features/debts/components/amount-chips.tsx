import { formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'

interface AmountChipsProps {
    remaining: number
    /** The plan's amount for this period, offered when it's less than the full remaining. */
    planned?: number | null
    value: number
    onPick: (amount: number) => void
    disabled?: boolean
}

/** One-tap amounts under a payment field: the plan's share, half, or all of it. */
export function AmountChips({ remaining, planned, value, onPick, disabled }: AmountChipsProps) {
    const options: { label: string; amount: number }[] = []
    if (planned && planned > 0 && planned < remaining) options.push({ label: 'This period’s plan', amount: Math.ceil(planned) })
    const half = Math.round(remaining / 2)
    if (half > 0 && half < remaining && !options.some(o => o.amount === half)) options.push({ label: 'Half', amount: half })
    options.push({ label: 'All of it', amount: remaining })

    return (
        <div className="flex gap-2 flex-wrap pt-1">
            {options.map(o => (
                <button
                    key={o.label}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(o.amount)}
                    className={cn(
                        'px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition-colors disabled:opacity-50',
                        value === o.amount
                            ? 'bg-surface-hover text-ink border-line'
                            : 'bg-white text-muted-ink border-line hover:text-ink'
                    )}
                >
                    {o.label} <span className="tabular-nums text-subtle-ink">· {formatShortCurrency(o.amount)}</span>
                </button>
            ))}
        </div>
    )
}
