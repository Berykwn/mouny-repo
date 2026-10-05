import { useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { AccountTypeTile } from '@/components/account-type-icon'
import type { Account } from '@/types'

interface ArchivedAccountsProps {
    accounts: Account[]
    onRestore: (account: Account) => Promise<void>
}

/** Accounts with history that are no longer used. Always empty, so they hold no money. */
export function ArchivedAccounts({ accounts, onRestore }: ArchivedAccountsProps) {
    const [restoringId, setRestoringId] = useState<string | null>(null)

    const restore = async (account: Account) => {
        setRestoringId(account.id)
        await onRestore(account)
        setRestoringId(null)
    }

    return (
        <div className="space-y-3 mt-5">
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-1">Archived</p>
            <div className="card overflow-hidden divide-y divide-line-soft">
                {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center gap-3 px-4 py-2.5">
                        <AccountTypeTile type={acc.type} className="w-8 h-8 opacity-60 grayscale" />
                        <p className="flex-1 min-w-0 text-[13px] font-medium text-muted-ink truncate">{acc.name}</p>
                        <button
                            type="button"
                            onClick={() => restore(acc)}
                            disabled={restoringId !== null}
                            className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-ink py-1.5 disabled:opacity-50"
                        >
                            {restoringId === acc.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RotateCcw className="w-3.5 h-3.5" />}
                            Restore
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
