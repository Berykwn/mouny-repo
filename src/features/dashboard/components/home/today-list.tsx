import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/helpers'
import { latestFirst, pairTransfers, isSpending } from '@/features/transactions/lib/ledger'
import { rowMeta } from '@/features/transactions/lib/row-format'
import { LedgerRowBody } from '@/features/transactions/components/ledger-row'
import type { TransactionWithDetails } from '@/types'
import { HomeSection } from './home-section'

/** One row, exactly as the Ledger draws it; a tap opens it there. */
export function HomeTxRow({ tx, otherSide }: { tx: TransactionWithDetails; otherSide?: string }) {
    const navigate = useNavigate()
    return (
        <div className="-mx-2">
            <button
                type="button"
                onClick={() => navigate('/transactions', { state: { openId: tx.id, periodId: tx.pay_period_id ?? undefined } })}
                className="w-full px-2 rounded-[12px] text-left transition-colors hover:bg-surface-soft active:bg-surface-hover"
            >
                <span className="flex items-center gap-3 py-3 border-b border-line-soft">
                    <LedgerRowBody tx={tx} meta={rowMeta(tx, { otherSide })} />
                </span>
            </button>
        </div>
    )
}

/** Rows as the Ledger lists them: a transfer once (its outgoing side), "BCA → GoPay". */
function Rows({ rows, otherSide }: { rows: TransactionWithDetails[]; otherSide: Map<string, string> }) {
    return (
        <div>
            {rows.map(tx => <HomeTxRow key={tx.id} tx={tx} otherSide={otherSide.get(tx.id)} />)}
        </div>
    )
}

function LedgerLink({ total }: { total?: number }) {
    return (
        <span className="flex items-baseline gap-2 text-[13px]">
            {total ? <span className="text-muted-ink tabular-nums">{formatCurrency(total)}</span> : null}
            <Link to="/transactions" className="font-medium text-brand-ink">Ledger</Link>
        </span>
    )
}

/** Today's entries, latest first, with what went out today beside the way to the Ledger. */
export function TodayList({ transactions, today }: { transactions: TransactionWithDetails[]; today: string }) {
    const { rows, otherSide } = useMemo(() => {
        const paired = pairTransfers(transactions.filter(t => t.date.slice(0, 10) === today))
        return { rows: [...paired.rows].sort(latestFirst), otherSide: paired.otherSide }
    }, [transactions, today])
    const spent = rows.filter(isSpending).reduce((s, t) => s + t.amount, 0)

    return (
        <HomeSection title="Today" aside={<LedgerLink total={spent} />}>
            {rows.length === 0 ? (
                <p className="py-2 text-[13px] text-muted-ink">Nothing logged yet today. A quiet wallet.</p>
            ) : (
                <Rows rows={rows} otherSide={otherSide} />
            )}
        </HomeSection>
    )
}

/** For a closed period there's no "today": its last few entries instead. */
export function LatestList({ transactions }: { transactions: TransactionWithDetails[] }) {
    // Paired first, so a transfer takes one of the five places, not two.
    const { latest, otherSide } = useMemo(() => {
        const paired = pairTransfers(transactions)
        const latest = [...paired.rows].sort((a, b) => b.date.localeCompare(a.date) || latestFirst(a, b)).slice(0, 5)
        return { latest, otherSide: paired.otherSide }
    }, [transactions])
    if (latest.length === 0) return null
    return (
        <HomeSection title="Last entries" aside={<LedgerLink />}>
            <Rows rows={latest} otherSide={otherSide} />
        </HomeSection>
    )
}
