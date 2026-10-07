import { useMemo } from 'react'
import { AccountTypeTile } from '@/components/account-type-icon'
import { formatCurrency } from '@/lib/helpers'
import { withSavingsMoves } from '@/lib/savings-moves'
import type { TransactionWithDetails } from '@/types'

/** Which accounts this period's spending came out of (savings excluded). */
export function SpendingByAccountCard({ transactions }: { transactions: TransactionWithDetails[] }) {
    const { byAccount, totalSpending } = useMemo(() => {
        const spending = withSavingsMoves(transactions).filter(t => t.type === 'expense' && !t.category?.is_savings)
        const map = new Map<string, { id: string; name: string; type: string; is_savings: boolean; amount: number }>()
        for (const tx of spending) {
            const entry = map.get(tx.account.id) ?? { id: tx.account.id, name: tx.account.name, type: tx.account.type, is_savings: tx.account.is_savings, amount: 0 }
            entry.amount += tx.amount
            map.set(tx.account.id, entry)
        }
        return {
            byAccount: Array.from(map.values()).sort((a, b) => b.amount - a.amount),
            totalSpending: spending.reduce((s, t) => s + t.amount, 0),
        }
    }, [transactions])

    if (byAccount.length === 0) return null

    return (
        <div className="card overflow-hidden">
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-4 pt-4">
                Spending by account
            </p>
            <p className="text-[11px] text-subtle-ink px-4 pb-3">% of this period's spending (savings excluded)</p>
            {byAccount.map(a => {
                const pct = totalSpending > 0 ? Math.round((a.amount / totalSpending) * 100) : 0
                return (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-[9px] border-b border-line-soft last:border-b-0">
                        <AccountTypeTile type={a.type} savings={a.is_savings} className="w-8 h-8" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[13px] text-ink truncate">{a.name}</p>
                                <p className="text-[13px] font-medium text-ink">
                                    {formatCurrency(a.amount)} <span className="font-normal text-muted-ink">· {pct}%</span>
                                </p>
                            </div>
                            <div className="h-1 rounded-full bg-line-soft overflow-hidden">
                                <div className="h-full rounded-full bg-[#94a3b8]" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
