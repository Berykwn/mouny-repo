import { formatCurrency } from '@/lib/helpers'
import type { Account, AccountType } from '@/types'
import { Trash2, Pencil, Banknote, Wallet2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccountListProps {
    accounts: Account[]
    onEdit: (account: Account) => void
    onDeleteRequest: (id: string) => void
}

const TYPE_ICON = {
    bank: Banknote,
    cash: Wallet2,
}

const TYPE_STYLE = {
    bank: 'bg-rose-100 text-rose-500 dark:bg-rose-950 dark:text-rose-400',
    cash: 'bg-emerald-100 text-emerald-500 dark:bg-emerald-950 dark:text-emerald-400',
}

const TYPE_LABEL = {
    bank: 'Bank account',
    cash: 'Cash',
}

export function AccountList({ accounts, onEdit, onDeleteRequest }: AccountListProps) {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden">
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {accounts.map((acc) => {
                    const Icon = TYPE_ICON[acc.type as AccountType]
                    const style = TYPE_STYLE[acc.type as AccountType]
                    const label = TYPE_LABEL[acc.type as AccountType]

                    return (
                        <div key={acc.id} className="flex items-center gap-3 px-4 py-3">
                            <div className={cn(
                                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                                style
                            )}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{acc.name}</p>
                                <p className="text-xs text-muted-foreground">{label}</p>
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
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onDeleteRequest(acc.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}