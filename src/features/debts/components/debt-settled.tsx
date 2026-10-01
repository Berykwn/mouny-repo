import CheckIcon from '~icons/ph/seal-check-duotone'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { DebtAvatar } from './debt-avatar'

const MAX_SHOWN = 5

interface DebtSettledProps {
    debts: DebtWithAccount[]
    onOpen: (debt: DebtWithAccount) => void
}

/** Debts paid off and money collected — so the page isn't only a list of what's outstanding. */
export function DebtSettled({ debts, onOpen }: DebtSettledProps) {
    if (debts.length === 0) return null

    const paidOff = debts.filter(d => d.type === 'debt').reduce((s, d) => s + d.total_amount, 0)
    const collected = debts.filter(d => d.type === 'receivable').reduce((s, d) => s + d.total_amount, 0)
    const shown = debts.slice(0, MAX_SHOWN)

    const summary = [
        paidOff > 0 && `${formatCurrency(paidOff)} paid off`,
        collected > 0 && `${formatCurrency(collected)} collected`,
    ].filter(Boolean).join(' · ')

    return (
        <div className="card overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className="w-10 h-10 rounded-[12px] bg-positive/10 text-positive flex items-center justify-center shrink-0">
                    <CheckIcon className="w-[22px] h-[22px]" />
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">
                        {debts.length} settled
                    </p>
                    <p className="text-[11px] text-muted-ink tabular-nums truncate">{summary}</p>
                </div>
            </div>

            <ul className="border-t border-line-soft divide-y divide-line-soft">
                {shown.map(debt => (
                    <li key={debt.id}>
                        <button
                            type="button"
                            onClick={() => onOpen(debt)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-soft"
                        >
                            <DebtAvatar name={debt.counterparty} type={debt.type} settled className="w-8 h-8 text-[11px]" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] text-ink truncate">{debt.counterparty}</p>
                                <p className="text-[10.5px] text-subtle-ink">{debt.type === 'debt' ? 'Paid off' : 'Paid back'}</p>
                            </div>
                            <p className="text-[12px] font-medium text-muted-ink tabular-nums shrink-0">
                                {formatShortCurrency(debt.total_amount)}
                            </p>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}
