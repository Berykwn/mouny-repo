import { formatShortCurrency } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { PlanRow, PlanSection, RowAmount } from '@/features/plan/components/layout'
import { DebtAvatar } from './debt-avatar'

const MAX_SHOWN = 5

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))

interface DebtSettledProps {
    debts: DebtWithAccount[]
    onOpen: (debt: DebtWithAccount) => void
}

/** Debts paid off and money collected — so the page isn't only a list of what's outstanding. */
export function DebtSettled({ debts, onOpen }: DebtSettledProps) {
    if (debts.length === 0) return null

    const paidOff = debts.filter(d => d.type === 'debt').reduce((s, d) => s + d.total_amount, 0)
    const collected = debts.filter(d => d.type === 'receivable').reduce((s, d) => s + d.total_amount, 0)
    const summary = [
        paidOff > 0 && `${formatShortCurrency(paidOff)} paid off`,
        collected > 0 && `${formatShortCurrency(collected)} collected`,
    ].filter(Boolean).join(' · ')

    return (
        <PlanSection title="Settled" meta={summary}>
            {debts.slice(0, MAX_SHOWN).map(debt => (
                <PlanRow
                    key={debt.id}
                    lead={<DebtAvatar name={debt.counterparty} settled />}
                    title={debt.counterparty}
                    sub={debt.type === 'debt' ? 'Paid off' : 'Paid back'}
                    onOpen={() => onOpen(debt)}
                    end={<RowAmount muted>{plain(debt.total_amount)}</RowAmount>}
                />
            ))}
        </PlanSection>
    )
}
