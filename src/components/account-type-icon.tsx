import BankIcon from '~icons/app/credit-card'
import CashIcon from '~icons/app/piggy-bank-alt'
import WalletIcon from '~icons/app/wallet'
import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { ACCOUNT_TILE_CLASS } from '@/lib/account-tiles'

export { BankIcon, CashIcon, WalletIcon }

interface AccountTypeIconProps extends SVGProps<SVGSVGElement> {
    type: string
}

export function AccountTypeIcon({ type, ...props }: AccountTypeIconProps) {
    const Icon = type === 'bank' ? BankIcon : CashIcon
    return <Icon {...props} />
}

interface AccountTypeTileProps {
    type: string
    className?: string
}

export function AccountTypeTile({ type, className }: AccountTypeTileProps) {
    return (
        <div className={cn(
            'w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0',
            ACCOUNT_TILE_CLASS[type] ?? ACCOUNT_TILE_CLASS.cash,
            className
        )}>
            <AccountTypeIcon type={type} className="w-6 h-6" />
        </div>
    )
}
