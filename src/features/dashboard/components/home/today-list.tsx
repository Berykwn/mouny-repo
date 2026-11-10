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

/**
 * Today's entries, latest first, with what went out today beside the way to the Ledger.
 * After days without an entry the balances have likely drifted from the wallet, so the empty
 * state asks for a count instead of calling it a quiet day.
 */
export function TodayList({ transactions, today, quietDays = null }: {
    transactions: TransactionWithDetails[]
    today: string
    /** daysWithoutEntries: days since the last entry, once it's been a while; null otherwise. */
    quietDays?: number | null
}) {
    const navigate = useNavigate()
    const { rows, otherSide } = useMemo(() => {
        const paired = pairTransfers(transactions.filter(t => t.date.slice(0, 10) === today))
        return { rows: [...paired.rows].sort(latestFirst), otherSide: paired.otherSide }
    }, [transactions, today])
    const spent = rows.filter(isSpending).reduce((s, t) => s + t.amount, 0)

    return (
        <HomeSection title="Today" aside={<LedgerLink total={spent} />}>
            {rows.length > 0 ? (
                <Rows rows={rows} otherSide={otherSide} />
            ) : quietDays !== null ? (
                <div className="flex items-center justify-between gap-3 rounded-[14px] border border-line px-3.5 py-3">
                    <p className="min-w-0 text-[13px] leading-snug text-muted-ink">
                        <span className="font-semibold text-ink">No entries for {quietDays} days.</span> Count your balances to catch up.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/accounts', { state: { count: true } })}
                        className="shrink-0 h-9 rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-surface-hover transition-colors"
                    >
                        Count balances
                    </button>
                </div>
            ) : (
                <p className="py-2 text-[13px] text-muted-ink">Nothing logged yet today. A quiet wallet.</p>
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
