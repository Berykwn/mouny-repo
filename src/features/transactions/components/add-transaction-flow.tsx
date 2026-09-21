import { BottomDrawer } from '@/components/bottom-drawer'
import { toISODate } from '@/lib/helpers'
import { AddTransactionForm } from './add-transaction-form'

interface AddTransactionFlowProps {
    payPeriodId: string
    periodStart: string
    periodEnd?: string
    defaultDate?: string
    onClose: () => void
    onSuccess: () => void
}

export function AddTransactionFlow({ payPeriodId, periodStart, periodEnd, defaultDate, onClose, onSuccess }: AddTransactionFlowProps) {
    const maxDate = periodEnd ?? toISODate()

    return (
        <BottomDrawer
            open
            onClose={onClose}
            title="New transaction"
            maxHeightClassName="max-h-[92%]"
            titleClassName="font-semibold text-[17px] text-[#252525]"
        >
            <AddTransactionForm
                payPeriodId={payPeriodId}
                periodStart={periodStart}
                maxDate={maxDate}
                defaultDate={defaultDate}
                onClose={onClose}
                onSuccess={onSuccess}
            />
        </BottomDrawer>
    )
}
