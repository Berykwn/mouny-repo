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
        <div className="rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden">
            <div className="divide-y divide-[#f2f2f0]">
                {accounts.map((acc) => {
                    const label = TYPE_LABEL[acc.type as AccountType]

                    return (
                        <div key={acc.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 rounded-[10px] bg-[#f4f4f2] flex items-center justify-center shrink-0">
                                <AccountTypeIcon type={acc.type} className="w-4 h-4 text-[#8a8a84]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-[#252525]">{acc.name}</p>
                                <p className="text-[11.5px] text-[#8a8a84]">{label}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <p className={cn(
                                    'text-[13px] font-medium mr-1',
                                    acc.balance < 0 ? 'text-[#dc2626]' : 'text-[#252525]'
                                )}>
                                    {formatCurrency(acc.balance)}
                                </p>
                                <button
                                    onClick={() => onEdit(acc)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#8a8a84] hover:text-[#252525] hover:bg-[#f4f4f2] transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onDeleteRequest(acc.id)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#8a8a84] hover:text-[#dc2626] hover:bg-[#f4f4f2] transition-colors"
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
