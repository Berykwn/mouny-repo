import type { ReactNode } from 'react'
import { isTransfer } from '@/lib/transaction-type'
import { cn } from '@/lib/utils'
import { CategoryTile } from '@/features/categories/components/category-icon'
import type { TransactionWithDetails } from '@/types'
import { txTitle } from '../lib/ledger'
import { formatAmount } from '../lib/row-format'
import { TypeIcon } from './type-icon'

/** Income in brand blue with a plus, transfers muted, spending plain ink. */
export function LedgerAmount({ tx, className }: { tx: TransactionWithDetails; className?: string }) {
    const transfer = isTransfer(tx.type)
    return (
        <span className={cn(
            'shrink-0 text-right text-[14px] font-medium tabular-nums',
            transfer ? 'text-muted-ink' : tx.type === 'income' ? 'text-brand' : 'text-ink',
            className,
        )}>
            {tx.type === 'income' ? '+' : ''}{formatAmount(tx.amount)}
        </span>
    )
}

/** A row's contents: the category tile, the note as its title over the meta line, and the amount. */
export function LedgerRowBody({ tx, meta }: { tx: TransactionWithDetails; meta: string }) {
    return (
        <>
            <CategoryTile category={tx.category} className="w-9 h-9 rounded-[11px]">
                {!tx.category && <TypeIcon type={tx.type} />}
            </CategoryTile>
            <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-medium text-ink truncate">{txTitle(tx)}</span>
                {meta && <span className="block mt-0.5 text-[11.5px] text-muted-ink truncate">{meta}</span>}
            </span>
            <LedgerAmount tx={tx} />
        </>
    )
}

/** A quiet day header: the day on the left, a total (or anything else) on the right. */
export function DayHeader({ label, children }: { label: string; children?: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3 pt-5 pb-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted-ink">{label}</p>
            {children && <p className="text-[11.5px] text-muted-ink tabular-nums truncate">{children}</p>}
        </div>
    )
}
