import { CreditCard, Receipt, ShoppingBag } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { usePeriods } from '@/queries'
import { useMoneyGlance } from '@/hooks/use-money-glance'
import { formatShortCurrency } from '@/lib/helpers'
import { Group, Row } from '@/features/menu/rows'

/** Money that is already spoken for or still to come: bills, debts and wishes. */
export default function PlanPage() {
    const { activePeriod } = usePeriods()
    const { bills, debts, wishes } = useMoneyGlance(activePeriod)

    const billSub = !bills
        ? 'Rent, utilities and subscriptions'
        : bills.due === 0
            ? 'Nothing due this period'
            : `${bills.due} due · ${formatShortCurrency(bills.reserved)} set aside`
    const billFlag = bills?.overdue ? { text: `${bills.overdue} overdue`, className: 'bg-negative/10 text-negative' } : null

    const debtSub = !debts
        ? 'Who you owe and who owes you'
        : debts.open === 0
            ? 'Nothing open'
            : [debts.owed > 0 && `You owe ${formatShortCurrency(debts.owed)}`, debts.receivable > 0 && `owed ${formatShortCurrency(debts.receivable)}`]
                .filter(Boolean).join(' · ')
    const debtFlag = debts?.overdue
        ? { text: `${debts.overdue} overdue`, className: 'bg-negative/10 text-negative' }
        : debts?.dueSoon
            ? { text: `${debts.dueSoon} due soon`, className: 'bg-warning/10 text-warning' }
            : null

    const wishSub = !wishes
        ? 'Things you’re saving toward'
        : wishes.count === 0
            ? 'Nothing on the list yet'
            : `${wishes.count} wish${wishes.count === 1 ? '' : 'es'} in progress`
    const wishFlag = wishes?.ready ? { text: `${wishes.ready} ready`, className: 'bg-positive/10 text-positive' } : null

    return (
        <>
            <PageHeader title="Plan" />
            <section className="px-4 pb-4 lg:px-0 space-y-4 lg:max-w-2xl">
                <p className="px-1 text-[12.5px] text-muted-ink leading-relaxed">
                    Money that is already spoken for, or still on its way.
                </p>
                <Group label="This period">
                    <Row to="/bills" icon={Receipt} tint="info" label="Bills" sub={billSub} flag={billFlag} />
                </Group>
                <Group label="Over time">
                    <Row to="/debts" icon={CreditCard} tint="warning" label="Debts" sub={debtSub} flag={debtFlag} />
                    <Row to="/wish-list" icon={ShoppingBag} tint="brand" label="Wishlist" sub={wishSub} flag={wishFlag} />
                </Group>
            </section>
        </>
    )
}
