import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import type { Account, AccountType } from '@/types'
import { AccountTypeTile } from '@/components/account-type-icon'
import { cn } from '@/lib/utils'
import type { AccountInsight } from '../lib/account-insights'

interface AccountListProps {
    accounts: Account[]
    insights: Map<string, AccountInsight>
    /** Tapping a row opens its detail sheet, where edit / transfer / delete live. */
    onOpen: (account: Account) => void
}

const TYPE_LABEL = {
    bank: 'Bank account',
    cash: 'Cash',
}

export function AccountList({ accounts, insights, onOpen }: AccountListProps) {
    return (
        <div className="card overflow-hidden divide-y divide-line-soft">
            {accounts.map((acc) => {
                const label = TYPE_LABEL[acc.type as AccountType]
                const info = insights.get(acc.id)
                const net = info ? info.moneyIn - info.moneyOut : 0

                return (
                    <button
                        key={acc.id}
                        type="button"
                        onClick={() => onOpen(acc)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-soft active:bg-surface-hover"
                    >
                        <AccountTypeTile type={acc.type} className="w-8 h-8" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="text-[13px] font-medium text-ink truncate">{acc.name}</p>
                                {acc.is_savings && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-info/10 text-info shrink-0">Savings</span>
                                )}
                                {info?.health === 'overdrawn' && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-negative/10 text-negative shrink-0">Overdrawn</span>
                                )}
                                {info?.health === 'low' && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning shrink-0">Low</span>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-ink">{label}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className={cn(
                                'text-[13px] font-medium tabular-nums',
                                acc.balance < 0 ? 'text-negative' : 'text-ink'
                            )}>
                                {formatCurrency(acc.balance)}
                            </p>
                            {net !== 0 && (
                                <p className={cn('text-[10.5px] tabular-nums', net > 0 ? 'text-positive' : 'text-muted-ink')}>
                                    {net > 0 ? '+' : '−'}{formatShortCurrency(Math.abs(net))} this period
                                </p>
                            )}
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
