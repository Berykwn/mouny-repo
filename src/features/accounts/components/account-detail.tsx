import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/helpers'
import { amountColor, isInflow } from '@/lib/transaction-type'
import { cn } from '@/lib/utils'
import { AccountTypeTile } from '@/components/account-type-icon'
import { CategoryTile } from '@/features/categories/components/category-icon'
import { TypeIcon } from '@/features/transactions/components/type-icon'
import { txTitle } from '@/features/transactions/lib/ledger'
import type { Account } from '@/types'
import type { AccountInsight } from '../lib/account-insights'

const TYPE_LABEL: Record<string, string> = { bank: 'Bank', cash: 'Cash' }
const RECENT_COUNT = 5

const BUTTON = 'h-12 rounded-[14px] text-[15px] font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none'

interface AccountDetailProps {
    account: Account
    insight: AccountInsight | undefined
    canTransfer: boolean
    hasActivePeriod: boolean
    onTransfer: () => void
    /** Opens the edit form on its balance adjustment. */
    onAdjust?: () => void
    onEdit: () => void
    onDelete: () => void
}

/** One account: its balance and how long it lasts, the three things to do with it, and its recent activity. */
export function AccountDetail({ account, insight, canTransfer, hasActivePeriod, onTransfer, onAdjust, onEdit, onDelete }: AccountDetailProps) {
    const recent = insight?.recent.slice(0, RECENT_COUNT) ?? []
    const facts = [
        TYPE_LABEL[account.type] ?? 'Account',
        account.is_savings ? 'savings' : 'everyday',
        !account.is_savings && insight?.runwayDays != null ? `lasts ~${insight.runwayDays} day${insight.runwayDays === 1 ? '' : 's'}` : null,
    ].filter(Boolean).join(' · ')

    return (
        <div className="space-y-5 pb-2">
            <div className="flex items-center gap-3">
                <AccountTypeTile type={account.type} savings={account.is_savings} className="w-12 h-12 rounded-[14px] [&_svg]:w-9 [&_svg]:h-9" />
                <div className="min-w-0">
                    <p className="text-[13px] text-subtle-ink">{facts}</p>
                    <p className={cn(
                        'text-[30px] font-semibold tracking-[-0.02em] leading-tight tabular-nums',
                        account.balance < 0 ? 'text-negative' : 'text-ink'
                    )}>
                        {formatCurrency(account.balance)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={onTransfer} disabled={!canTransfer} className={cn(BUTTON, 'bg-action text-on-action hover:bg-action/90')}>
                    Transfer
                </button>
                <button type="button" onClick={onAdjust ?? onEdit} className={cn(BUTTON, 'bg-line-soft text-ink hover:bg-surface-hover')}>
                    Adjust
                </button>
                <button type="button" onClick={onEdit} className={cn(BUTTON, 'bg-line-soft text-ink hover:bg-surface-hover')}>
                    Edit
                </button>
            </div>
            {!canTransfer && (
                <p className="-mt-3 text-[12.5px] text-subtle-ink">Add a second account to move money between them.</p>
            )}

            {hasActivePeriod && (
                <div>
                    <div className="flex items-baseline justify-between">
                        <h3 className="text-[17px] font-semibold text-ink">Recent</h3>
                        <Link to="/transactions" className="text-[14px] font-semibold text-brand-ink hover:text-brand">Ledger</Link>
                    </div>
                    {recent.length === 0 ? (
                        <p className="py-3 text-[13.5px] text-subtle-ink">Nothing from this account this period yet.</p>
                    ) : (
                        <ul>
                            {recent.map(tx => (
                                <li key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft last:border-0">
                                    <CategoryTile category={tx.category} className="w-10 h-10 rounded-[12px]">
                                        {!tx.category && <TypeIcon type={tx.type} />}
                                    </CategoryTile>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[15px] text-ink">{txTitle(tx)}</p>
                                        <p className="text-[13px] text-subtle-ink">{formatDateShort(tx.date)}</p>
                                    </div>
                                    <p className={cn('text-[15px] tabular-nums shrink-0', amountColor(tx.type))}>
                                        {isInflow(tx.type) ? '+' : ''}{tx.amount.toLocaleString('id-ID')}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="flex justify-center pt-1">
                <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-[13px] font-medium text-subtle-ink hover:text-negative py-2">
                    <Trash2 className="w-3.5 h-3.5" /> Delete account
                </button>
            </div>
        </div>
    )
}
