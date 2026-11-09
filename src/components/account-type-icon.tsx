import BankIcon from '~icons/app/bank'
import CashIcon from '~icons/app/cash'
import CreditCardIcon from '~icons/app/credit-card'
import SavingsIcon from '~icons/app/piggy-bank-alt'
import WalletIcon from '~icons/app/wallet'
import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { ACCOUNT_TILE_CLASS, CREDIT_TILE_CLASS, SAVINGS_TILE_CLASS } from '@/lib/account-tiles'

export { BankIcon, CashIcon, CreditCardIcon, SavingsIcon, WalletIcon }

type Look = 'bank' | 'cash' | 'ewallet' | 'savings' | 'credit'

/**
 * What an account looks like. The role wins when it's given (a credit card, a savings
 * pocket each look like what they're for); without it, the older `savings` flag shows the
 * piggy bank, and otherwise the type decides.
 */
function lookOf(type: string, savings?: boolean | null, role?: string | null): Look {
    if (role === 'credit' || role === 'savings') return role
    if (!role && savings) return 'savings'
    return type === 'bank' || type === 'ewallet' ? type : 'cash'
}

const ICON: Record<Look, ComponentType<SVGProps<SVGSVGElement>>> = {
    bank: BankIcon,
    cash: CashIcon,
    ewallet: WalletIcon,
    savings: SavingsIcon,
    credit: CreditCardIcon,
}

const TILE: Record<Look, string> = {
    bank: ACCOUNT_TILE_CLASS.bank,
    cash: ACCOUNT_TILE_CLASS.cash,
    ewallet: ACCOUNT_TILE_CLASS.ewallet,
    savings: SAVINGS_TILE_CLASS,
    credit: CREDIT_TILE_CLASS,
}

// `role` here is the account's, not the ARIA attribute.
interface AccountTypeIconProps extends Omit<SVGProps<SVGSVGElement>, 'role'> {
    type: string
    // A savings account shows the piggy bank, whatever its type.
    savings?: boolean | null
    /** The account's role; when given it decides over `savings`. */
    role?: string | null
}

export function AccountTypeIcon({ type, savings, role, ...props }: AccountTypeIconProps) {
    const Icon = ICON[lookOf(type, savings, role)]
    return <Icon {...props} />
}

interface AccountTypeTileProps {
    type: string
    savings?: boolean | null
    /** The account's role; when given it decides over `savings`. */
    role?: string | null
    className?: string
}

export function AccountTypeTile({ type, savings, role, className }: AccountTypeTileProps) {
    return (
        <div className={cn(
            'w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0',
            TILE[lookOf(type, savings, role)],
            className
        )}>
            <AccountTypeIcon type={type} savings={savings} role={role} className="w-6 h-6" />
        </div>
    )
}
