import { Link } from 'react-router-dom'
import { ChevronRight, Wallet } from 'lucide-react'
import { AccountTypeTile } from '@/components/account-type-icon'
import { availableToSpend, balanceBreakdown, pickerOrder, ROLE_LABEL, roleOf } from '@/lib/account-roles'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account } from '@/types'
import { HomeSection } from '../home/home-section'
import { overdrawnBy } from '../../lib/home'

interface BalancesCardProps {
    accounts: Account[]
    isActivePeriod: boolean
    closingBalance: number | null
}

const TYPE_LABEL: Record<string, string> = { bank: 'Bank', cash: 'Cash', ewallet: 'E-wallet' }

/** The line under an account's name: its role, or for an everyday one where it sits. */
function accountLabel(account: Account): string {
    const role = roleOf(account)
    if (role === 'everyday') return TYPE_LABEL[account.type] ?? 'Bank'
    // A card's balance is mostly what's owed; what's left to spend on it says more.
    if (role === 'credit' && account.credit_limit != null) {
        return `Credit · ${formatCurrency(Math.max(0, availableToSpend(account)))} available`
    }
    return ROLE_LABEL[role]
}

/** One quiet row with the total; it opens Accounts, which has no tab of its own. */
export function BalancesRow({ accounts, isActivePeriod, closingBalance }: BalancesCardProps) {
    // Net of what's owed on cards, the same sum a period stores as its closing balance.
    const accountsTotal = balanceBreakdown(accounts).total
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
                {/* Grouped by role like the pickers, the user's order inside each. */}
                {pickerOrder(accounts).map(a => (
                    <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft last:border-b-0">
                        <AccountTypeTile type={a.type} savings={a.is_savings} role={a.role} className="w-10 h-10" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] text-ink">{a.name}</p>
                            <p className="truncate text-[12px] text-muted-ink">{accountLabel(a)}</p>
                        </div>
                        {/* A card below zero is what's owed on it, not a problem: red only past its limit. */}
                        <p className={cn('shrink-0 text-[14px] font-medium tabular-nums', overdrawnBy(a) > 0 ? 'text-negative' : 'text-ink')}>
                            {formatCurrency(a.balance)}
                        </p>
                    </div>
                ))}
            </div>
        </HomeSection>
    )
}
