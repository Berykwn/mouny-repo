import { Trash2 } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/helpers'
import { amountColor, isInflow } from '@/lib/transaction-type'
import { cn } from '@/lib/utils'
import { AccountTypeTile } from '@/components/account-type-icon'
import { CategoryTile } from '@/features/categories/components/category-icon'
import { TypeIcon } from '@/features/transactions/components/type-icon'
import { txTitle } from '@/features/transactions/lib/ledger'
import { owedOn, roleOf } from '@/lib/account-roles'
import type { Account } from '@/types'
import { creditLine, isOverdrawn, type AccountInsight } from '../lib/account-insights'

const TYPE_LABEL: Record<string, string> = { bank: 'Bank', cash: 'Cash', ewallet: 'E-wallet' }
const RECENT_COUNT = 5

const BUTTON = 'h-12 rounded-[14px] text-[15px] font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none'

interface AccountDetailProps {
    account: Account
    insight: AccountInsight | undefined
    canTransfer: boolean
    hasActivePeriod: boolean
    onTransfer: () => void
    /** Opens the edit form on its balance adjustment (an asset's "Update value"). */
    onAdjust: () => void
    /** A credit account with something owed: pay it off from an everyday account. Null when nothing can pay it. */
    onPayOff: (() => void) | null
    onEdit: () => void
    onDelete: () => void
    /** Opens the ledger for this account. */
    onLedger: () => void
}

const ROLE_WORD = { everyday: 'everyday', credit: 'credit', savings: 'savings', asset: 'asset' } as const

/**
 * One account: its balance and how long it lasts, the three things to do with it, and its
 * recent activity. The first action follows the role: a card is paid off, an asset's
 * value is updated, anything else is transferred from.
 */
export function AccountDetail({ account, insight, canTransfer, hasActivePeriod, onTransfer, onAdjust, onPayOff, onEdit, onDelete, onLedger }: AccountDetailProps) {
    const role = roleOf(account)
    const recent = insight?.recent.slice(0, RECENT_COUNT) ?? []
    const facts = [
        TYPE_LABEL[account.type] ?? 'Account',
        ROLE_WORD[role],
        insight?.runwayDays != null ? `lasts ~${insight.runwayDays} day${insight.runwayDays === 1 ? '' : 's'}` : null,
    ].filter(Boolean).join(' · ')
    const owed = owedOn(account)

    const primary = cn(BUTTON, 'bg-action text-on-action hover:bg-action/90')
    const secondary = cn(BUTTON, 'bg-line-soft text-ink hover:bg-surface-hover')

    return (
        <div className="space-y-5 pb-2">
            <div className="flex items-center gap-3">
                <AccountTypeTile type={account.type} savings={account.is_savings} role={account.role} className="w-12 h-12 rounded-[14px] [&_svg]:w-9 [&_svg]:h-9" />
                <div className="min-w-0">
                    <p className="text-[13px] text-subtle-ink">{facts}</p>
                    <p className={cn(
                        'text-[30px] font-semibold tracking-[-0.02em] leading-tight tabular-nums',
                        // Below zero on a card is owing, said underneath; red is for overdrawn.
                        isOverdrawn(account) ? 'text-negative' : 'text-ink'
                    )}>
                        {formatCurrency(account.balance)}
                    </p>
                    {role === 'credit' && (
                        <p className={cn('text-[13px]', isOverdrawn(account) ? 'text-negative' : 'text-muted-ink')}>
                            {isOverdrawn(account) ? `Over its limit · ${creditLine(account)}` : creditLine(account)}
                        </p>
                    )}
                    {role === 'asset' && <p className="text-[13px] text-muted-ink">Not spent from</p>}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {role === 'credit' ? (
                    // Moving money off a card is rare; paying it is the point. Adjust stays in Edit.
                    <>
                        <button type="button" onClick={onPayOff ?? undefined} disabled={!onPayOff || owed === 0} className={primary}>
                            Pay off
                        </button>
                        <button type="button" onClick={onTransfer} disabled={!canTransfer} className={secondary}>
                            Transfer
                        </button>
                    </>
                ) : role === 'asset' ? (
                    <>
                        <button type="button" onClick={onAdjust} className={primary}>
                            Update value
                        </button>
                        <button type="button" onClick={onTransfer} disabled={!canTransfer} className={secondary}>
                            Transfer
                        </button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={onTransfer} disabled={!canTransfer} className={primary}>
                            Transfer
                        </button>
                        <button type="button" onClick={onAdjust} className={secondary}>
                            Adjust
                        </button>
                    </>
                )}
                <button type="button" onClick={onEdit} className={secondary}>
                    Edit
                </button>
            </div>
            {!canTransfer ? (
                <p className="-mt-3 text-[12.5px] text-subtle-ink">Add a second account to move money between them.</p>
            ) : role === 'credit' && owed > 0 && !onPayOff ? (
                <p className="-mt-3 text-[12.5px] text-subtle-ink">Pay off needs an everyday or savings account with money in it.</p>
            ) : null}

            {hasActivePeriod && (
                <div>
                    <div className="flex items-baseline justify-between">
                        <h3 className="text-[17px] font-semibold text-ink">Recent</h3>
                        <button type="button" onClick={onLedger} className="text-[14px] font-semibold text-brand-ink hover:text-brand">Ledger</button>
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
