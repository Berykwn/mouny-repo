import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BottomDrawer } from '@/components/bottom-drawer'
import { formatCurrency } from '@/lib/helpers'
import type { PayPeriod } from '@/types'
import type { BillDue } from '../lib/bills'
import { BillDueRow } from './bill-due-row'
import { PayBillForm } from './pay-bill-form'

interface BillsDueCardProps {
    dues: BillDue[]
    period: Pick<PayPeriod, 'id' | 'start_date'>
}

/** The open period's bills, unpaid first, each payable in two taps. */
export function BillsDueCard({ dues, period }: BillsDueCardProps) {
    const [paying, setPaying] = useState<BillDue | null>(null)
    const reserved = dues.reduce((s, d) => s + d.reserved, 0)
    const paidCount = dues.filter(d => d.status === 'paid').length

    return (
        <div className="card px-4 pt-4 pb-2">
            <div className="flex items-baseline justify-between">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Bills this period</p>
                <Link to="/bills" className="text-[11.5px] font-medium text-muted-ink hover:text-ink">Manage</Link>
            </div>
            <p className="mt-1 text-[12px] text-muted-ink">
                {reserved > 0
                    ? <>{formatCurrency(reserved)} still due · {paidCount} of {dues.length} paid</>
                    : 'All paid for this period'}
            </p>
            <div className="mt-1 divide-y divide-line-soft">
                {dues.map(due => (
                    <BillDueRow key={due.bill.id} due={due} onPay={() => setPaying(due)} />
                ))}
            </div>

            <BottomDrawer open={!!paying} onClose={() => setPaying(null)} title={paying ? `Pay ${paying.bill.name}` : ''}>
                {paying && (
                    <PayBillForm
                        key={paying.bill.id}
                        bill={paying.bill}
                        nextDue={paying.nextDue}
                        payPeriodId={period.id}
                        periodStart={period.start_date}
                        onSuccess={() => setPaying(null)}
                    />
                )}
            </BottomDrawer>
        </div>
    )
}
