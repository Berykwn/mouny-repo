import { Check } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { AccountTypeTile } from '@/components/account-type-icon'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account } from '@/types'

interface AccountPickerDrawerProps {
    open: boolean
    onClose: () => void
    accounts: Account[]
    selectedId?: string | null
    onSelect: (account: Account) => void
}

export function AccountPickerDrawer({ open, onClose, accounts, selectedId, onSelect }: AccountPickerDrawerProps) {
    return (
        <BottomDrawer open={open} onClose={onClose} title="Select Account">
            <div className="space-y-1 pb-2">
                {accounts.map((a) => (
                    <button
                        key={a.id}
                        type="button"
                        onClick={() => onSelect(a)}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors',
                            selectedId === a.id ? 'bg-[#f4f4f2]' : 'hover:bg-[#fbfbfa]'
                        )}
                    >
                        <AccountTypeTile type={a.type} savings={a.is_savings} />
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#252525] truncate">{a.name}</p>
                            <p className="text-[11px] text-[#8a8a84]">{formatCurrency(a.balance ?? 0)}</p>
                        </div>
                        {selectedId === a.id && (
                            <div className="w-4 h-4 rounded-full bg-[#6FA82B] flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </BottomDrawer>
    )
}
