import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { AccountTypeIcon } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { formatCurrency, parseCurrencyInput } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account } from '@/types'

interface TransferFieldsProps {
    accounts: Account[]
    fromAccountId: string
    toAccountId: string
    /** The amount typed above, for each side's balance after the transfer. */
    amount: string
    onFromChange: (id: string) => void
    onToChange: (id: string) => void
    disabled?: boolean
}

/** One side of a transfer: the account, its balance, and where the balance ends up. */
function AccountCard({ label, account, after, onClick, disabled }: {
    label: string
    account: Account | undefined
    after: number | null
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-label={`${label}: ${account?.name ?? 'select account'}`}
            className="flex-1 min-w-0 rounded-[16px] border border-line bg-surface p-3.5 text-left transition-colors hover:bg-surface-soft disabled:opacity-50 disabled:pointer-events-none"
        >
            <span className="block text-[11.5px] text-muted-ink">{label}</span>
            <AccountTypeIcon aria-hidden="true" type={account?.type ?? 'cash'} savings={account?.is_savings} className="mt-2 w-6 h-6" />
            <span className="mt-2 block text-[14px] font-semibold text-ink truncate">{account?.name ?? 'Select'}</span>
            {account && (
                <span className="block text-[11.5px] text-muted-ink tabular-nums truncate">
                    {after === null ? formatCurrency(account.balance) : (
                        <>→ <span className={cn(after < 0 ? 'text-negative' : 'text-ink')}>{formatCurrency(after)}</span></>
                    )}
                </span>
            )}
        </button>
    )
}

export function TransferFields({
    accounts,
    fromAccountId,
    toAccountId,
    amount,
    onFromChange,
    onToChange,
    disabled,
}: TransferFieldsProps) {
    const [pickerOpen, setPickerOpen] = useState<'from' | 'to' | null>(null)

    const fromAccount = accounts.find((a) => a.id === fromAccountId)
    const toAccount = accounts.find((a) => a.id === toAccountId)
    const parsedAmount = parseCurrencyInput(amount)

    // Each side's balance once the money has moved, as soon as there's an amount.
    const afterFrom = fromAccount && parsedAmount > 0 ? fromAccount.balance - parsedAmount : null
    const afterTo = toAccount && parsedAmount > 0 ? toAccount.balance + parsedAmount : null

    return (
        <div>
            <div className="flex items-stretch gap-2">
                <AccountCard label="From" account={fromAccount} after={afterFrom} onClick={() => setPickerOpen('from')} disabled={disabled} />
                <ArrowRight aria-hidden="true" className="self-center w-4 h-4 text-muted-ink shrink-0" />
                <AccountCard label="To" account={toAccount} after={afterTo} onClick={() => setPickerOpen('to')} disabled={disabled} />
            </div>

            <AccountPickerDrawer
                open={pickerOpen === 'from'}
                onClose={() => setPickerOpen(null)}
                accounts={accounts.filter((a) => a.id !== toAccountId)}
                selectedId={fromAccountId}
                onSelect={(a) => { onFromChange(a.id); setPickerOpen(null) }}
            />
            <AccountPickerDrawer
                open={pickerOpen === 'to'}
                onClose={() => setPickerOpen(null)}
                accounts={accounts.filter((a) => a.id !== fromAccountId)}
                selectedId={toAccountId}
                onSelect={(a) => { onToChange(a.id); setPickerOpen(null) }}
            />
        </div>
    )
}
