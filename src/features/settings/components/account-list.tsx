import { formatCurrency } from '@/lib/helpers'
import type { Account, AccountType } from '@/types'
import { Building2, Wallet, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccountListProps {
    accounts: Account[]
    onEdit: (account: Account) => void
    onDeleteRequest: (id: string) => void
}

const TYPE_ICON = {
    bank: Building2,
    cash: Wallet,
}

const TYPE_STYLE = {
    bank: 'bg-indigo-100 text-indigo-600',
    cash: 'bg-rose-100 text-rose-600',
}

export function AccountList({ accounts, onEdit, onDeleteRequest }: AccountListProps) {
    return (
        <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {accounts.map((acc) => {
                const Icon = TYPE_ICON[acc.type as AccountType]
                const style = TYPE_STYLE[acc.type as AccountType]

                return (
                    <div key={acc.id} className="flex items-center gap-3 px-4 py-3 group">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            style
                        )}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{acc.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {acc.type === 'bank' ? 'Bank account' : 'Cash'}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <p className={cn(
                                'text-sm font-semibold mr-1',
                                acc.balance < 0 ? 'text-destructive' : ''
                            )}>
                                {formatCurrency(acc.balance)}
                            </p>
                            <button
                                onClick={() => onEdit(acc)}
                                className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => onDeleteRequest(acc.id)}
                                className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}