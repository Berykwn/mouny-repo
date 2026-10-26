import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { useBills, useBudgets, useDebts, usePeriods, usePeriodTransactions } from '@/queries'
import { toISODate } from '@/lib/helpers'
import type { BillDue } from '@/features/bills/lib/bills'
import type { Account, PayPeriod, TransactionWithDetails } from '@/types'
import { pickSmartLine, type SmartLine } from '../../lib/home'

const DISMISSED_KEY = 'mouny.home.smart-line.dismissed'

function readDismissed(): string | null {
    try { return sessionStorage.getItem(DISMISSED_KEY) } catch { return null }
}

function writeDismissed(key: string) {
    try { sessionStorage.setItem(DISMISSED_KEY, key) } catch { /* private mode: it just comes back */ }
}

interface SmartLineSlotProps {
    period: Pick<PayPeriod, 'id'>
    transactions: TransactionWithDetails[]
    accounts: Account[]
    dues: BillDue[]
    daysLeft: number | null
}

/**
 * The one line under the hero worth acting on, if there is one. "Not now" hides that line
 * for the session; a different one (or the same one with new numbers) still shows.
 */
export function SmartLineSlot({ period, transactions, accounts, dues, daysLeft }: SmartLineSlotProps) {
    const { periods } = usePeriods()
    const { data: bills } = useBills()
    const { data: debts } = useDebts({ activeOnly: true })
    const { data: budgets } = useBudgets()
    // Periods are newest first: the one before this follows it.
    const index = periods.findIndex(p => p.id === period.id)
    const previous = index >= 0 ? periods[index + 1] : undefined
    const { data: previousTxs } = usePeriodTransactions(previous?.id)
    const [dismissed, setDismissed] = useState(readDismissed)

    const line = useMemo(() => {
        // Each check needs its data; until it's in, that check simply doesn't fire.
        return pickSmartLine({
            today: toISODate(),
            bills: bills ?? [],
            recentTransactions: [...transactions, ...(previousTxs ?? [])],
            debts: debts ?? [],
            budgets: budgets ?? [],
            transactions,
            daysLeft,
            accounts,
            dues,
        })
    }, [bills, debts, budgets, transactions, previousTxs, daysLeft, accounts, dues])

    if (!line || line.key === dismissed) return null
    return (
        <SmartLineCard
            line={line}
            onDismiss={() => {
                writeDismissed(line.key)
                setDismissed(line.key)
            }}
        />
    )
}

function SmartLineCard({ line, onDismiss }: { line: SmartLine; onDismiss: () => void }) {
    return (
        <div role="status" className="flex gap-3 rounded-[18px] bg-surface-hover px-4 py-3.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-brand-ink">
                <Lightbulb aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-relaxed text-muted-ink">
                    {line.parts.map((p, i) => p.strong
                        ? <span key={i} className="font-semibold text-ink">{p.text}</span>
                        : <span key={i}>{p.text}</span>)}
                </p>
                <div className="mt-1.5 flex items-center gap-4 text-[13.5px] font-semibold">
                    <Link to={line.action.to} className="text-brand-ink hover:underline underline-offset-2">{line.action.label}</Link>
                    <button type="button" onClick={onDismiss} className="text-muted-ink hover:text-ink">Not now</button>
                </div>
            </div>
        </div>
    )
}
