import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { AccountTypeTile } from '@/components/account-type-icon'
import { ROLE_LABEL, groupByRole } from '@/lib/account-roles'
import { accountSubline } from '@/lib/account-spend'
import { cn } from '@/lib/utils'
import type { Account } from '@/types'

interface AccountPickerDrawerProps {
    open: boolean
    onClose: () => void
    accounts: Account[]
    selectedId?: string | null
    onSelect: (account: Account) => void
}

const GROUP_HEADING = 'px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'

export function AccountPickerDrawer({ open, onClose, accounts, selectedId, onSelect }: AccountPickerDrawerProps) {
    // Every account, grouped by what its money is for, in the user's own order inside each.
    // Nothing is hidden: the user knows best which one paid.
    const groups = groupByRole(accounts)
    // A heading over a single group only repeats what's obvious.
    const showHeadings = groups.length > 1

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
                {groups.map((g) => (
                    <div key={g.role} role="group" aria-label={showHeadings ? ROLE_LABEL[g.role] : undefined} className="space-y-1">
                        {showHeadings && <p aria-hidden="true" className={GROUP_HEADING}>{ROLE_LABEL[g.role]}</p>}
                        {g.accounts.map((a) => (
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
                                <AccountTypeTile type={a.type} savings={a.is_savings} role={a.role} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-ink truncate">{a.name}</p>
                                    <p className="text-[11px] text-muted-ink">{accountSubline(a)}</p>
                                </div>
                                {selectedId === a.id && (
                                    <div className="w-4 h-4 rounded-full bg-brand flex items-center justify-center shrink-0">
                                        <Check className="w-2.5 h-2.5 text-on-brand" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </BottomDrawer>
    )
}
