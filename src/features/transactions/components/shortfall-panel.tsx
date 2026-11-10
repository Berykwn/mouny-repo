import { useState } from 'react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { BusyLabel } from '@/components/busy-label'
import { CashCountForm } from '@/features/accounts/components/cash-count-form'
import { formatCurrency } from '@/lib/helpers'
import { useAccounts, usePeriods } from '@/queries'
import type { Account } from '@/types'
import { shortfallLine, type Shortfall } from '../lib/shortfall'

interface ShortfallPanelProps {
    shortfall: Shortfall<Account>
    /** "save" or "transfer": what happens after the top-up, said on the button. */
    then: string
    /** Moves the top-up in, then saves the entry. Only called when a top-up is offered. */
    onTopUp: () => void
    busy?: boolean
    /** Set while the top-up is the thing running, so only its button spins. */
    toppingUp?: boolean
}

/**
 * Shown in place of a dead-end "Insufficient balance": the account is usually right in
 * life and behind on paper. Two ways on, both leaving the entry as typed: move money in
 * from the fullest other everyday account (offered only when one can cover it), or count
 * the account (a sheet over this one; once it's saved the balance here is the counted
 * one, and the entry is still there to save).
 */
export function ShortfallPanel({ shortfall, then, onTopUp, busy, toppingUp }: ShortfallPanelProps) {
    const [counting, setCounting] = useState(false)
    const { activePeriod } = usePeriods()
    // The latest copy of the account, so a sheet opened after a refetch counts against it.
    const { data: accounts } = useAccounts()
    const account = accounts?.find(a => a.id === shortfall.account.id) ?? shortfall.account
    const { source, topUp } = shortfall

    return (
        <div role="status" className="rounded-[14px] bg-warning-soft px-3.5 py-3 space-y-2.5">
            <p className="text-[12.5px] text-warning-ink leading-snug">{shortfallLine(shortfall)}</p>
            <div className="flex flex-col gap-2">
                {source && topUp !== null && (
                    <button
                        type="button"
                        onClick={onTopUp}
                        disabled={busy}
                        className="h-10 px-3 rounded-[12px] bg-action text-on-action text-[13px] font-semibold hover:bg-action/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <BusyLabel busy={!!toppingUp} className="mx-auto">
                            Top up {formatCurrency(topUp)} from {source.name} &amp; {then}
                        </BusyLabel>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setCounting(true)}
                    disabled={busy}
                    className="h-10 px-3 rounded-[12px] border border-line bg-surface text-[13px] font-semibold text-ink hover:bg-surface-soft transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                    Count {account.name}
                </button>
            </div>

            <BottomDrawer open={counting} onClose={() => setCounting(false)} title={`Count ${account.name}`}>
                {counting && (
                    <CashCountForm
                        accounts={[account]}
                        hasActivePeriod={!!activePeriod}
                        onSuccess={() => setCounting(false)}
                    />
                )}
            </BottomDrawer>
        </div>
    )
}
