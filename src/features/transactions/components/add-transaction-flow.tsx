import { BottomDrawer } from '@/components/bottom-drawer'
import { toISODate } from '@/lib/helpers'
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

    return (
        <BottomDrawer
            open
            onClose={onClose}
            title={initial ? 'Edit transaction' : 'New transaction'}
            maxHeightClassName="max-h-[92%]"
            titleClassName="font-semibold text-[17px] text-ink"
        >
            <AddTransactionForm
                key={initial?.id}
                payPeriodId={payPeriodId}
                periodStart={periodStart}
                maxDate={maxDate}
                defaultDate={defaultDate}
                initial={initial}
                onClose={onClose}
                onSuccess={onSuccess}
            />
        </BottomDrawer>
    )
}
