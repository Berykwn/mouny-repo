import type { Account } from '@/types'
import { AccountTypeTile } from '@/components/account-type-icon'
import { cn } from '@/lib/utils'
import { accountLine, type AccountInsight } from '../lib/account-insights'

interface AccountListProps {
    accounts: Account[]
    insights: Map<string, AccountInsight>
    /** Tapping a row opens its detail sheet, where transfer / adjust / edit live. */
    onOpen: (account: Account) => void
}

const amount = (n: number) => n.toLocaleString('id-ID')

/**
 * Accounts in two groups, everyday then savings, each with its total. Rows on a phone,
 * cards on desktop.
 */
export function AccountList({ accounts, insights, onOpen }: AccountListProps) {
    const groups = [
        { label: 'Everyday', items: accounts.filter(a => !a.is_savings) },
        { label: 'Savings', items: accounts.filter(a => a.is_savings) },
    ].filter(g => g.items.length > 0)

    return (
        <div className="space-y-6">
            {groups.map(group => (
                <section key={group.label}>
                    <div className="flex items-baseline justify-between pb-1 lg:pb-3">
                        <h2 className="text-[17px] font-semibold text-ink">{group.label}</h2>
                        <span className="text-[13px] text-subtle-ink tabular-nums">{amount(group.items.reduce((s, a) => s + a.balance, 0))}</span>
                    </div>

                    <ul className="lg:grid lg:grid-cols-2 lg:gap-4">
                        {group.items.map(acc => {
                            const line = accountLine(acc, insights.get(acc.id))
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
                                            <AccountTypeTile type={acc.type} savings={acc.is_savings} className="w-11 h-11 rounded-[12px] [&_svg]:w-8 [&_svg]:h-8" />
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[15.5px] font-medium text-ink truncate">{acc.name}</span>
                                                <span className={cn('block text-[13px] truncate', line.negative ? 'text-negative' : 'text-subtle-ink')}>{line.text}</span>
                                            </span>
                                        </span>
                                        <span className={cn(
                                            'text-[15.5px] font-medium tabular-nums shrink-0 lg:text-[22px] lg:font-semibold',
                                            acc.balance < 0 ? 'text-negative' : 'text-ink',
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
