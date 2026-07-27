import { Landmark, Wallet } from 'lucide-react'
import type { LucideProps } from 'lucide-react'

interface AccountTypeIconProps extends LucideProps {
    type: string
}

export function AccountTypeIcon({ type, ...props }: AccountTypeIconProps) {
    const Icon = type === 'bank' ? Landmark : Wallet
    return <Icon {...props} />
}
