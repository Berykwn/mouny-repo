import { Link } from 'react-router-dom'
import { ChevronRight, Wallet } from 'lucide-react'
import { AccountTypeTile } from '@/components/account-type-icon'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account } from '@/types'
import { HomeSection } from '../home/home-section'

interface BalancesCardProps {
    accounts: Account[]
    isActivePeriod: boolean
    closingBalance: number | null
}

/** One quiet row with the total; it opens Accounts, which has no tab of its own. */
export function BalancesRow({ accounts, isActivePeriod, closingBalance }: BalancesCardProps) {
    const accountsTotal = accounts.reduce((s, a) => s + a.balance, 0)
    const total = isActivePeriod ? accountsTotal : (closingBalance ?? accountsTotal)

    return (
        <Link
            to="/accounts"
            className="flex items-center gap-3 border-b border-line py-3.5 text-left hover:bg-surface-soft transition-colors"
        >
            <Wallet aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-muted-ink" strokeWidth={1.8} />
            <span className="flex-1 text-[14px] text-muted-ink">{isActivePeriod ? 'Balances' : 'Closing balance'}</span>
            <span className={cn('text-[15px] font-semibold tabular-nums', total < 0 ? 'text-negative' : 'text-ink')}>
                {formatCurrency(total)}
            </span>
            <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-ink" />
        </Link>
    )
}

/** Desktop has the room for each account; today's balances, so only for the open period. */
export function BalancesList({ accounts }: { accounts: Account[] }) {
    if (accounts.length === 0) return null
    return (
        <HomeSection
            title="Balances"
            aside={<Link to="/accounts" className="text-[13px] font-medium text-brand-ink">Accounts</Link>}
        >
            <div>
                {accounts.map(a => (
                    <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft last:border-b-0">
                        <AccountTypeTile type={a.type} savings={a.is_savings} className="w-10 h-10" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] text-ink">{a.name}</p>
                            <p className="truncate text-[12px] text-muted-ink">{a.is_savings ? 'Savings' : a.type === 'cash' ? 'Cash' : 'Bank'}</p>
                        </div>
                        <p className={cn('shrink-0 text-[14px] font-medium tabular-nums', a.balance < 0 ? 'text-negative' : 'text-ink')}>
                            {formatCurrency(a.balance)}
                        </p>
                    </div>
                ))}
            </div>
        </HomeSection>
    )
}
