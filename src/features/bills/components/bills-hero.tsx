import { daysUntil, formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { HeroAction, HeroGlow } from '@/components/hero'
import type { BillDue } from '../lib/bills'
import { shortDate } from '../lib/bill-labels'

interface BillsHeroProps {
    dues: BillDue[]
    reserved: number
    billCount: number
    hasPeriod: boolean
    onAdd: () => void
}

function heroMessage(dues: BillDue[], reserved: number, billCount: number, hasPeriod: boolean) {
    if (billCount === 0) {
        return { text: 'Add rent, utilities and subscriptions. Mouny holds back what’s due from safe to spend.', className: 'text-ink' }
    }
    if (!hasPeriod) {
        return { text: 'Open a pay period to see what’s due in it.', className: 'text-muted-ink' }
    }
    const overdue = dues.filter(d => d.status === 'overdue')
    if (overdue.length > 0) {
        const sum = overdue.reduce((s, d) => s + d.reserved, 0)
        const days = -daysUntil(overdue[0].nextDue!)
        return {
            text: overdue.length === 1
                ? `${overdue[0].bill.name} is ${days} day${days === 1 ? '' : 's'} overdue — ${formatCurrency(sum)} to pay.`
                : `${overdue.length} bills are overdue — ${formatCurrency(sum)} to pay.`,
            className: 'text-negative',
        }
    }
    const soon = dues.find(d => d.status === 'soon')
    if (soon) {
        const days = daysUntil(soon.nextDue!)
        const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `on ${shortDate(soon.nextDue!)}`
        return { text: `${soon.bill.name}, ${formatCurrency(soon.bill.amount)}, is due ${when}.`, className: 'text-warning' }
    }
    if (dues.length === 0) return { text: 'Nothing falls due this period.', className: 'text-ink' }
    if (reserved === 0) return { text: 'Every bill this period is paid.', className: 'text-ink' }
    return { text: `${formatCurrency(reserved)} stays held back from safe to spend until these are paid.`, className: 'text-ink' }
}

/** This period's bills: what's still to pay, what's paid, and the one thing to know. */
export function BillsHero({ dues, reserved, billCount, hasPeriod, onAdd }: BillsHeroProps) {
    const paid = dues.filter(d => d.status === 'paid')
    const paidTotal = dues.reduce((s, d) => s + d.paidAmount, 0)
    const dueCount = dues.length - paid.length
    const message = heroMessage(dues, reserved, billCount, hasPeriod)

    return (
        <header className="card p-5 relative overflow-hidden">
            <HeroGlow />
            <div className="relative flex items-center justify-between mb-4">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Still to pay</p>
                <HeroAction onClick={onAdd}>Bill</HeroAction>
            </div>

            <div className="relative">
                <p className={cn(
                    'text-[32px] lg:text-[26px] font-medium tracking-[-0.02em] leading-none tabular-nums',
                    dues.length > 0 && reserved === 0 ? 'text-positive' : 'text-ink'
                )}>
                    {formatCurrency(reserved)}
                </p>
                <p className="text-[11px] text-muted-ink mt-2">
                    {dues.length === 0 ? 'this period' : `${paid.length} of ${dues.length} bills paid this period`}
                </p>

                {/* Paid against still due, on one bar */}
                {dues.length > 0 && (
                    <div className="mt-4">
                        <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-line-soft">
                            {paidTotal > 0 && <div className="h-full bg-positive/80" style={{ flexGrow: paidTotal }} />}
                            {reserved > 0 && <div className="h-full bg-info/70" style={{ flexGrow: reserved }} />}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-[11px] text-muted-ink">
                                    <span className="w-2 h-2 rounded-full bg-positive/80 shrink-0" /> Paid
                                </p>
                                <p className="text-[14px] font-medium text-ink tabular-nums truncate mt-0.5">{formatCurrency(paidTotal)}</p>
                                <p className="text-[10.5px] text-subtle-ink">{paid.length} bill{paid.length === 1 ? '' : 's'}</p>
                            </div>
                            <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-[11px] text-muted-ink">
                                    <span className="w-2 h-2 rounded-full bg-info/70 shrink-0" /> Still due
                                </p>
                                <p className="text-[14px] font-medium text-ink tabular-nums truncate mt-0.5">{formatCurrency(reserved)}</p>
                                <p className="text-[10.5px] text-subtle-ink">{dueCount} bill{dueCount === 1 ? '' : 's'}</p>
                            </div>
                        </div>
                    </div>
                )}

                <p className={cn('mt-4 pt-3 border-t border-line-soft text-[12px] leading-relaxed', message.className)}>
                    {message.text}
                </p>
            </div>
        </header>
    )
}
