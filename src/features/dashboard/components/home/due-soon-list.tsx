import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { useCategories } from '@/queries'
import { daysUntil, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { CategoryTile } from '@/features/categories/components/category-icon'
import { dayDate, relativeDays } from '@/features/bills/lib/bill-labels'
import type { BillDue } from '@/features/bills/lib/bills'
import type { PayPeriod } from '@/types'
import { HomeSection } from './home-section'

// Loads when a bill is first paid from Home, with its date picker.
const PayBillForm = lazy(() => import('@/features/bills/components/pay-bill-form').then(m => ({ default: m.PayBillForm })))

/** A few rows keep Home calm; the rest are a tap away on Bills. */
const MAX_ROWS = 4

interface DueSoonListProps {
    dues: BillDue[]
    period: Pick<PayPeriod, 'id' | 'start_date'>
}

/** The open period's unpaid bills, soonest first, each payable from its row. */
export function DueSoonList({ dues, period }: DueSoonListProps) {
    const [paying, setPaying] = useState<BillDue | null>(null)
    const { data: categories } = useCategories('expense')
    const unpaid = useMemo(() => dues.filter(d => d.outstanding > 0 && d.nextDue), [dues])

    if (unpaid.length === 0) return null

    return (
        <HomeSection
            title="Due before payday"
            aside={unpaid.length > MAX_ROWS
                ? <Link to="/bills" className="text-[13px] font-medium text-brand-ink">All {unpaid.length}</Link>
                : null}
        >
            <div>
                {unpaid.slice(0, MAX_ROWS).map(due => {
                    const category = categories?.find(c => c.id === due.bill.category_id)
                    const days = daysUntil(due.nextDue!)
                    return (
                        <div key={due.bill.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft last:border-b-0">
                            {category ? (
                                <CategoryTile category={category} className="w-10 h-10 rounded-[12px]" />
                            ) : (
                                <span className="w-10 h-10 rounded-[12px] shrink-0 flex items-center justify-center bg-surface-hover text-muted-ink">
                                    <CalendarClock aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] text-ink">{due.bill.name}</p>
                                <p className={cn('truncate text-[12px]', days < 0 ? 'text-negative' : 'text-muted-ink')}>
                                    {dayDate(due.nextDue!)} · {relativeDays(days)}
                                    {due.outstanding > 1 ? ` · ${due.outstanding} due` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPaying(due)}
                                className="shrink-0 h-9 rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink tabular-nums hover:bg-surface-hover transition-colors"
                            >
                                Pay {formatShortCurrency(due.bill.amount)}
                            </button>
                        </div>
                    )
                })}
            </div>

            <BottomDrawer open={!!paying} onClose={() => setPaying(null)} title={paying ? `Pay ${paying.bill.name}` : ''}>
                {paying && (
                    <Suspense fallback={null}>
                        <PayBillForm
                            key={paying.bill.id}
                            bill={paying.bill}
                            nextDue={paying.nextDue}
                            payPeriodId={period.id}
                            periodStart={period.start_date}
                            onSuccess={() => setPaying(null)}
                        />
                    </Suspense>
                )}
            </BottomDrawer>
        </HomeSection>
    )
}
