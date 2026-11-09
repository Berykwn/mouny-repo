import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Account } from '@/types'
import { AccountTypeTile } from '@/components/account-type-icon'
import { groupByRole, ROLE_LABEL } from '@/lib/account-roles'
import { cn } from '@/lib/utils'
import { accountLine, isOverdrawn, type AccountInsight } from '../lib/account-insights'

interface AccountListProps {
    accounts: Account[]
    insights: Map<string, AccountInsight>
    /** Tapping a row opens its detail sheet, where transfer / adjust / edit live. */
    onOpen: (account: Account) => void
    /** Reorder mode: rows get up/down buttons instead of opening. Moves stay inside a role group. */
    onMove?: (account: Account, step: -1 | 1) => void
}

const amount = (n: number) => n.toLocaleString('id-ID')

const MOVE_BUTTON = 'w-9 h-9 rounded-[10px] border border-line flex items-center justify-center text-ink hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:pointer-events-none'

/**
 * Accounts grouped by role (everyday, credit, savings, assets), each with its total, in the
 * user's own order inside a group. Rows on a phone, cards on desktop.
 */
export function AccountList({ accounts, insights, onOpen, onMove }: AccountListProps) {
    const groups = groupByRole(accounts)

    return (
        <div className="space-y-6">
            {groups.map(group => (
                <section key={group.role}>
                    <div className="flex items-baseline justify-between pb-1 lg:pb-3">
                        <h2 className="text-[17px] font-semibold text-ink">{ROLE_LABEL[group.role]}</h2>
                        <span className="text-[13px] text-subtle-ink tabular-nums">{amount(group.accounts.reduce((s, a) => s + a.balance, 0))}</span>
                    </div>

                    <ul className={cn(!onMove && 'lg:grid lg:grid-cols-2 lg:gap-4')}>
                        {group.accounts.map((acc, i) => {
                            const line = accountLine(acc, insights.get(acc.id))
                            const tile = <AccountTypeTile type={acc.type} savings={acc.is_savings} role={acc.role} className="w-11 h-11 rounded-[12px] [&_svg]:w-8 [&_svg]:h-8" />

                            if (onMove) {
                                return (
                                    <li key={acc.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft last:border-0">
                                        {tile}
                                        <span className="flex-1 min-w-0 text-[15.5px] font-medium text-ink truncate">{acc.name}</span>
                                        <button type="button" onClick={() => onMove(acc, -1)} disabled={i === 0} aria-label={`Move ${acc.name} up`} className={MOVE_BUTTON}>
                                            <ChevronUp aria-hidden="true" className="w-4 h-4" />
                                        </button>
                                        <button type="button" onClick={() => onMove(acc, 1)} disabled={i === group.accounts.length - 1} aria-label={`Move ${acc.name} down`} className={MOVE_BUTTON}>
                                            <ChevronDown aria-hidden="true" className="w-4 h-4" />
                                        </button>
                                    </li>
                                )
                            }

                            return (
                                <li key={acc.id} className="border-b border-line-soft last:border-0 lg:border-0">
                                    <button
                                        type="button"
                                        onClick={() => onOpen(acc)}
                                        className={cn(
                                            'w-full flex items-center gap-3 py-3 text-left transition-colors',
                                            'lg:flex-col lg:items-stretch lg:gap-3 lg:p-4 lg:rounded-[16px] lg:border lg:border-line lg:hover:border-line-strong',
                                        )}
                                    >
                                        <span className="flex items-center gap-3 flex-1 min-w-0">
                                            {tile}
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[15.5px] font-medium text-ink truncate">{acc.name}</span>
                                                <span className={cn('block text-[13px] truncate', line.negative ? 'text-negative' : 'text-subtle-ink')}>{line.text}</span>
                                            </span>
                                        </span>
                                        <span className={cn(
                                            'text-[15.5px] font-medium tabular-nums shrink-0 lg:text-[22px] lg:font-semibold',
                                            // A card below zero is owing, which its line already says; red is for overdrawn.
                                            isOverdrawn(acc) ? 'text-negative' : 'text-ink',
                                        )}>
                                            <span className="hidden lg:inline">Rp </span>{amount(acc.balance)}
                                        </span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </section>
            ))}
        </div>
    )
}
