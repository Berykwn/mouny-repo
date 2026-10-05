import { ArrowLeftRight, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/helpers'
import { amountColor, amountSign } from '@/lib/transaction-type'
import { cn } from '@/lib/utils'
import { AccountTypeTile } from '@/components/account-type-icon'
import { CategoryTile } from '@/features/categories/components/category-icon'
import { TypeIcon } from '@/features/transactions/components/type-icon'
import { txTitle } from '@/features/transactions/lib/ledger'
import type { Account, AccountType } from '@/types'
import { LOW_RUNWAY_DAYS, type AccountInsight } from '../lib/account-insights'

const TYPE_LABEL = { bank: 'Bank account', cash: 'Cash' }
const RECENT_COUNT = 5

const PRIMARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none'

interface AccountDetailProps {
    account: Account
    insight: AccountInsight | undefined
    canTransfer: boolean
    hasActivePeriod: boolean
    onTransfer: () => void
    onEdit: () => void
    onDelete: () => void
}

/** One account's period activity and recent transactions, with its actions. */
export function AccountDetail({ account, insight, canTransfer, hasActivePeriod, onTransfer, onEdit, onDelete }: AccountDetailProps) {
    const recent = insight?.recent.slice(0, RECENT_COUNT) ?? []
    const moneyIn = insight?.moneyIn ?? 0
    const moneyOut = insight?.moneyOut ?? 0

    let healthNote: { text: string; className: string } | null = null
    if (insight?.health === 'overdrawn') {
        healthNote = { text: 'This account is below zero. Transfer money in to cover it.', className: 'bg-negative/10 text-negative' }
    } else if (insight?.health === 'low' && insight.runwayDays !== null) {
        healthNote = {
            text: `At this period’s pace it runs out in about ${insight.runwayDays} day${insight.runwayDays === 1 ? '' : 's'} (under ${LOW_RUNWAY_DAYS}).`,
            className: 'bg-warning/10 text-warning',
        }
    }

    return (
        <div className="space-y-4 pb-2">
            <div className="flex items-center gap-3">
                <AccountTypeTile type={account.type} savings={account.is_savings} className="w-12 h-12 rounded-[14px]" />
                <div className="min-w-0">
                    <p className="text-[11px] text-muted-ink">{TYPE_LABEL[account.type as AccountType]}</p>
                    <p className={cn(
                        'text-[24px] font-medium tracking-[-0.02em] leading-tight tabular-nums',
                        account.balance < 0 ? 'text-negative' : 'text-ink'
                    )}>
                        {formatCurrency(account.balance)}
                    </p>
                </div>
            </div>

            {healthNote && (
                <p className={cn('rounded-[14px] px-3 py-2.5 text-[12px] leading-relaxed', healthNote.className)}>{healthNote.text}</p>
            )}

            {hasActivePeriod && (
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-[#f0f0ee] bg-[#f0f0ee]">
                    <div className="bg-white p-3">
                        <p className="text-[11px] text-muted-ink">In this period</p>
                        <p className="text-[15px] font-medium text-positive tabular-nums mt-1">+{formatCurrency(moneyIn)}</p>
                    </div>
                    <div className="bg-white p-3">
                        <p className="text-[11px] text-muted-ink">Out this period</p>
                        <p className="text-[15px] font-medium text-ink tabular-nums mt-1">−{formatCurrency(moneyOut)}</p>
                    </div>
                </div>
            )}

            <div className="rounded-[20px] border border-line overflow-hidden">
                <p className="px-4 pt-3 pb-2 text-[11px] uppercase tracking-[.14em] text-muted-ink">Recent this period</p>
                {recent.length === 0 ? (
                    <p className="px-4 pb-3 text-[12px] text-muted-ink">No transactions from this account yet.</p>
                ) : (
                    <ul className="divide-y divide-line-soft border-t border-line-soft">
                        {recent.map(tx => (
                            <li key={tx.id} className="flex items-center gap-2.5 px-4 py-2">
                                <CategoryTile category={tx.category}>
                                    {!tx.category && <TypeIcon type={tx.type} />}
                                </CategoryTile>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12.5px] font-medium text-ink">{txTitle(tx)}</p>
                                    <p className="text-[10.5px] text-subtle-ink">{formatDateShort(tx.date)}</p>
                                </div>
                                <p className={cn('text-[12.5px] tabular-nums shrink-0', amountColor(tx.type))}>
                                    {amountSign(tx.type)}{formatCurrency(tx.amount)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="space-y-2 pt-1">
                <button type="button" onClick={onTransfer} disabled={!canTransfer} className={PRIMARY_BTN}>
                    <ArrowLeftRight className="w-4 h-4" /> Transfer
                </button>
                {!canTransfer && (
                    <p className="text-center text-[11px] text-muted-ink">Add a second account to transfer between them.</p>
                )}
                <div className="flex items-center justify-center gap-6 pt-1">
                    <button type="button" onClick={onEdit} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-ink py-2">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-negative py-2">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                </div>
            </div>
        </div>
    )
}
