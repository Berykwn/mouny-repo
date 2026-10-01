import { formatCurrency, formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { HeroAction, HeroGlow } from '@/components/hero'
import type { DebtSummary } from '../lib/debt-insights'
import { dueStatus } from '../lib/debt-insights'

interface DebtsHeroProps {
    summary: DebtSummary
    /** Total across accounts, to say whether what you owe is covered. Null when unknown. */
    totalBalance: number | null
    canAdd: boolean
    onAdd: () => void
}

function heroMessage({ owed, receivable, overdueDebts, overdueReceivables, nextDue, debtCount, receivableCount }: DebtSummary, totalBalance: number | null) {
    if (debtCount + receivableCount === 0) {
        return { text: 'Nothing open. Note down money you borrow or lend so neither side forgets.', className: 'text-ink' }
    }
    if (overdueDebts.length > 0) {
        const sum = overdueDebts.reduce((s, d) => s + d.remaining_amount, 0)
        return {
            text: overdueDebts.length === 1
                ? `Your debt to ${overdueDebts[0].counterparty} is past due — ${formatCurrency(sum)} left to pay.`
                : `${overdueDebts.length} debts are past due — ${formatCurrency(sum)} left to pay.`,
            className: 'text-negative',
        }
    }
    if (nextDue) {
        const status = dueStatus(nextDue)
        const when = status.kind === 'today' ? 'today' : `on ${formatDate(nextDue.due_date!)}`
        return {
            text: nextDue.type === 'debt'
                ? `${formatCurrency(nextDue.remaining_amount)} to ${nextDue.counterparty} is due ${when}.`
                : `${nextDue.counterparty} should pay back ${formatCurrency(nextDue.remaining_amount)} ${when}.`,
            className: 'text-warning',
        }
    }
    if (overdueReceivables.length > 0) {
        return {
            text: overdueReceivables.length === 1
                ? `${overdueReceivables[0].counterparty} is late paying you back — a gentle reminder may help.`
                : `${overdueReceivables.length} people are late paying you back.`,
            className: 'text-warning',
        }
    }
    if (owed > 0 && totalBalance !== null) {
        return totalBalance >= owed
            ? { text: 'Your accounts can cover everything you owe. Nothing is due this week.', className: 'text-ink' }
            : { text: `You owe ${formatCurrency(owed - totalBalance)} more than your accounts hold right now.`, className: 'text-warning' }
    }
    if (owed === 0) {
        return { text: `You owe nobody. ${formatCurrency(receivable)} is still coming back to you.`, className: 'text-ink' }
    }
    return { text: 'Nothing is due this week.', className: 'text-ink' }
}

export function DebtsHero({ summary, totalBalance, canAdd, onAdd }: DebtsHeroProps) {
    const { owed, receivable, debtCount, receivableCount } = summary
    const net = receivable - owed
    const hasAny = debtCount + receivableCount > 0
    const message = heroMessage(summary, totalBalance)

    return (
        <header className="card p-5 relative overflow-hidden">
            <HeroGlow />
            <div className="relative flex items-center justify-between mb-4">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Net position</p>
                <HeroAction onClick={onAdd} disabled={!canAdd}>Debt</HeroAction>
            </div>

            <div className="relative">
                <p className={cn(
                    'text-[32px] lg:text-[26px] font-medium tracking-[-0.02em] leading-none tabular-nums',
                    net > 0 ? 'text-positive' : net < 0 ? 'text-negative' : 'text-ink'
                )}>
                    {net > 0 ? '+' : ''}{formatCurrency(net)}
                </p>
                <p className="text-[11px] text-muted-ink mt-2">
                    {!hasAny ? 'All settled' : net > 0 ? 'more owed to you than you owe' : net < 0 ? 'more than you’re owed' : 'what you owe and are owed even out'}
                </p>

                {/* The two sides on one bar: red for what you owe, green for what's owed to you */}
                {hasAny && (
                    <div className="mt-4">
                        <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-line-soft">
                            {owed > 0 && <div className="h-full bg-negative/80" style={{ flexGrow: owed }} />}
                            {receivable > 0 && <div className="h-full bg-positive/80" style={{ flexGrow: receivable }} />}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-[11px] text-muted-ink">
                                    <span className="w-2 h-2 rounded-full bg-negative/80 shrink-0" /> You owe
                                </p>
                                <p className="text-[14px] font-medium text-ink tabular-nums truncate mt-0.5">{formatCurrency(owed)}</p>
                                <p className="text-[10.5px] text-subtle-ink">{debtCount} open</p>
                            </div>
                            <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-[11px] text-muted-ink">
                                    <span className="w-2 h-2 rounded-full bg-positive/80 shrink-0" /> Owed to you
                                </p>
                                <p className="text-[14px] font-medium text-ink tabular-nums truncate mt-0.5">{formatCurrency(receivable)}</p>
                                <p className="text-[10.5px] text-subtle-ink">{receivableCount} open</p>
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
