import { useState } from 'react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { CashCountForm } from '@/features/accounts/components/cash-count-form'
import { toISODate } from '@/lib/helpers'
import { useAccounts, usePeriods } from '@/queries'
import type { TransactionWithDetails } from '@/types'
import { AddTransactionForm } from './add-transaction-form'

interface AddTransactionFlowProps {
    payPeriodId: string
    periodStart: string
    periodEnd?: string
    defaultDate?: string
    /** Opens the form on this transaction, to edit it. */
    initial?: TransactionWithDetails
    onClose: () => void
    onSuccess: () => void
}

export function AddTransactionFlow({ payPeriodId, periodStart, periodEnd, defaultDate, initial, onClose, onSuccess }: AddTransactionFlowProps) {
    const maxDate = periodEnd ?? toISODate()
    const [dirty, setDirty] = useState(false)
    const [counting, setCounting] = useState(false)
    const { data: accounts } = useAccounts()
    const { activePeriod } = usePeriods()

    // Counted instead of entering: with nothing typed here the entry sheet has done its
    // job and goes too; with a draft it stays, so nothing typed is lost.
    const counted = () => {
        setCounting(false)
        if (!dirty) onClose()
    }

    return (
        <BottomDrawer
            open
            onClose={onClose}
            title={initial ? 'Edit transaction' : 'New transaction'}
            maxHeightClassName="max-h-[92%]"
            titleClassName="font-semibold text-[17px] text-ink"
            confirmDiscard={dirty ? (initial ? 'Discard your changes?' : 'Discard this transaction?') : null}
        >
            <AddTransactionForm
                key={initial?.id}
                payPeriodId={payPeriodId}
                periodStart={periodStart}
                maxDate={maxDate}
                defaultDate={defaultDate}
                initial={initial}
                onSuccess={onSuccess}
                onDirtyChange={setDirty}
            />

            {/* The way out for someone days behind: writing each entry back in is what made
                them stop; counting the wallets takes a minute. Quiet, under the form. */}
            {!initial && accounts && accounts.length > 0 && (
                <>
                    <div className="flex justify-center pt-3 pb-1">
                        <button
                            type="button"
                            onClick={() => setCounting(true)}
                            className="py-1.5 text-[12.5px] font-medium text-muted-ink hover:text-ink underline-offset-2 hover:underline transition-colors"
                        >
                            Lost track? Count balances instead
                        </button>
                    </div>
                    <BottomDrawer open={counting} onClose={() => setCounting(false)} title="Count balances">
                        {counting && <CashCountForm accounts={accounts} hasActivePeriod={!!activePeriod} onSuccess={counted} />}
                    </BottomDrawer>
                </>
            )}
        </BottomDrawer>
    )
}
