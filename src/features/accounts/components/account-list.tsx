import { formatCurrency } from '@/lib/helpers'
import type { Account, AccountType } from '@/types'
import { Trash2, Pencil } from 'lucide-react'
import { AccountTypeIcon } from '@/components/account-type-icon'
import { cn } from '@/lib/utils'

interface AccountListProps {
    accounts: Account[]
    onEdit: (account: Account) => void
    onDeleteRequest: (id: string) => void
}

const TYPE_LABEL = {
    bank: 'Bank account',
    cash: 'Cash',
}

export function AccountList({ accounts, onEdit, onDeleteRequest }: AccountListProps) {
    return (
        <div className="card overflow-hidden divide-y divide-line-soft">
            {accounts.map((acc) => {
                const label = TYPE_LABEL[acc.type as AccountType]

                return (
                    <div key={acc.id} className="flex items-center gap-3 px-4 py-[9px]">
                        <div className="w-8 h-8 rounded-[10px] bg-info/10 flex items-center justify-center shrink-0">
                            <AccountTypeIcon type={acc.type} className="w-4 h-4 text-info" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-ink truncate">{acc.name}</p>
                            <p className="text-[11px] text-muted-ink">{label}</p>
                        </div>
                        <p className={cn(
                            'text-[13px] font-medium shrink-0',
                            acc.balance < 0 ? 'text-negative' : 'text-ink'
                        )}>
                            {formatCurrency(acc.balance)}
                        </p>
                        <div className="flex items-center shrink-0">
                            <button
                                onClick={() => onEdit(acc)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-ink hover:text-ink hover:bg-surface-hover transition-colors"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => onDeleteRequest(acc.id)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-ink hover:text-negative hover:bg-surface-hover transition-colors"
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
