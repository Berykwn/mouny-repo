import { useMemo, useState } from 'react'
import { SmartLine as SharedSmartLine } from '@/components/smart-line'
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
 * for the session; a different one (or the same one in a new state) still shows.
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

/** The shared smart line, so Home's looks like every other page's. */
function SmartLineCard({ line, onDismiss }: { line: SmartLine; onDismiss: () => void }) {
    return (
        <div role="status">
            <SharedSmartLine
                actions={[
                    { label: line.action.label, to: line.action.to },
                    { label: 'Not now', onClick: onDismiss },
                ]}
            >
                {line.parts.map((p, i) => p.strong ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>)}
            </SharedSmartLine>
        </div>
    )
}
