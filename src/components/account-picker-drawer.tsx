import { Link } from 'react-router-dom'
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
        <BottomDrawer open={open} onClose={onClose} title="Select account">
            <div className="space-y-1 pb-2">
                {accounts.length === 0 && (
                    <div className="py-2 text-center">
                        <p className="text-[14px] text-subtle-ink">No accounts to pick from yet.</p>
                        <Link
                            to="/accounts"
                            state={{ add: true }}
                            onClick={onClose}
                            className="mt-1 inline-block py-1 text-[14px] font-semibold text-brand-ink hover:text-brand transition-colors"
                        >
                            Add an account first
                        </Link>
                    </div>
                )}
                {accounts.map((a) => (
                    <button
                        key={a.id}
                        type="button"
                        onClick={() => onSelect(a)}
                        aria-pressed={selectedId === a.id}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors',
                            selectedId === a.id ? 'bg-surface-hover' : 'hover:bg-surface-soft'
                        )}
                    >
                        <AccountTypeTile type={a.type} savings={a.is_savings} />
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-ink truncate">{a.name}</p>
                            <p className="text-[11px] text-muted-ink">{formatCurrency(a.balance ?? 0)}</p>
                        </div>
                        {selectedId === a.id && (
                            <div className="w-4 h-4 rounded-full bg-brand flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-on-brand" strokeWidth={3} />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </BottomDrawer>
    )
}
