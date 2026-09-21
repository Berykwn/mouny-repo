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
            className="flex w-full items-center justify-between rounded-[20px] border border-[#e5e5e5] bg-white px-5 py-4 text-left"
        >
            <div className="flex items-center gap-2.5">
                <Wallet className="h-4 w-4 text-[#a3a3a3]" />
                <span className="text-[13.5px] text-[#252525]">
                    {isActivePeriod ? 'Balances' : 'Closing balance'}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-medium tabular-nums text-[#252525]">
                    {formatCurrency(total)}
                </span>
                <ArrowRight className="h-[13px] w-[13px] text-[#8a8a84]" />
            </div>
        </button>
    )
}
