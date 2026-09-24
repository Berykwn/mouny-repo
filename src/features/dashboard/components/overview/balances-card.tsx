import { ArrowRight, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/helpers'
import type { Account } from '@/types'

interface BalancesCardProps {
    accounts: Account[]
    isActivePeriod: boolean
    closingBalance: number | null
}

export function BalancesCard({ accounts, isActivePeriod, closingBalance }: BalancesCardProps) {
    const navigate = useNavigate()

    const accountsTotal = accounts.reduce((s, a) => s + a.balance, 0)
    const total = isActivePeriod ? accountsTotal : (closingBalance ?? accountsTotal)

    return (
        <button
            type="button"
            onClick={() => navigate('/accounts')}
            className="card flex w-full items-center justify-between px-5 py-4 text-left"
        >
            <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-info/10">
                    <Wallet className="h-3.5 w-3.5 text-info" />
                </div>
                <span className="text-[13.5px] text-ink">
                    {isActivePeriod ? 'Balances' : 'Closing balance'}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-medium tabular-nums text-ink">
                    {formatCurrency(total)}
                </span>
                <ArrowRight className="h-[13px] w-[13px] text-muted-ink" />
            </div>
        </button>
    )
}
