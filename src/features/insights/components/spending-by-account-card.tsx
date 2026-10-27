import { AccountTypeTile } from '@/components/account-type-icon'
import { formatCurrency } from '@/lib/helpers'
import type { AccountSpending } from '../lib/spending-by-account'

/** One row per account, with its share as a thin single-hue bar. */
export function SpendingByAccountList({ byAccount, totalSpending }: { byAccount: AccountSpending[]; totalSpending: number }) {
    if (byAccount.length === 0) return null
    return (
        <div>
            {byAccount.map(a => {
                const pct = totalSpending > 0 ? Math.round((a.amount / totalSpending) * 100) : 0
                return (
                    <div key={a.id} className="flex items-center gap-3 py-[9px] border-b border-line-soft last:border-b-0">
                        <AccountTypeTile type={a.type} savings={a.is_savings} className="w-8 h-8" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[13px] text-ink truncate">{a.name}</p>
                                <p className="text-[13px] font-medium text-ink tabular-nums">
                                    {formatCurrency(a.amount)} <span className="font-normal text-muted-ink">· {pct}%</span>
                                </p>
                            </div>
                            <div aria-hidden="true" className="h-1 rounded-full bg-line-soft overflow-hidden">
                                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
