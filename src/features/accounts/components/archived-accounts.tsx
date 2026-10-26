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
        <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[.06em] text-subtle-ink pb-1">Archived</h2>
            <ul>
                {accounts.map(acc => (
                    <li key={acc.id} className="flex items-center gap-3 py-2.5 border-b border-line-soft last:border-0">
                        <AccountTypeTile type={acc.type} savings={acc.is_savings} className="w-9 h-9 opacity-60 grayscale" />
                        <p className="flex-1 min-w-0 text-[14.5px] text-muted-ink truncate">{acc.name}</p>
                        <button
                            type="button"
                            onClick={() => restore(acc)}
                            disabled={restoringId !== null}
                            className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-ink hover:text-ink py-1.5 disabled:opacity-50"
                        >
                            {restoringId === acc.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RotateCcw className="w-3.5 h-3.5" />}
                            Restore
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    )
}
