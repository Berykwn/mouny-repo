import BankIcon from '~icons/app/bank'
import CashIcon from '~icons/app/cash'
import SavingsIcon from '~icons/app/piggy-bank-alt'
import WalletIcon from '~icons/app/wallet'
import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { ACCOUNT_TILE_CLASS, SAVINGS_TILE_CLASS } from '@/lib/account-tiles'

export { BankIcon, CashIcon, SavingsIcon, WalletIcon }

interface AccountTypeIconProps extends SVGProps<SVGSVGElement> {
    type: string
    // A savings account shows the piggy bank, whatever its type.
    savings?: boolean | null
}

export function AccountTypeIcon({ type, savings, ...props }: AccountTypeIconProps) {
    const Icon = savings ? SavingsIcon : type === 'bank' ? BankIcon : CashIcon
    return <Icon {...props} />
}

interface AccountTypeTileProps {
    type: string
    savings?: boolean | null
    className?: string
}

export function AccountTypeTile({ type, savings, className }: AccountTypeTileProps) {
    return (
        <div className={cn(
            'w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0',
            savings ? SAVINGS_TILE_CLASS : ACCOUNT_TILE_CLASS[type] ?? ACCOUNT_TILE_CLASS.cash,
            className
        )}>
            <AccountTypeIcon type={type} savings={savings} className="w-6 h-6" />
        </div>
    )
}
