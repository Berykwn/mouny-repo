import { useState } from 'react'
import { ChevronDown, Wallet } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account } from '@/types'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'

interface TransferFieldsProps {
    accounts: Account[]
    fromAccountId: string
    toAccountId: string
    amount: string
    onFromChange: (id: string) => void
    onToChange: (id: string) => void
    onAmountChange: (value: string) => void
    disabled?: boolean
}

export function TransferFields({
    accounts,
    fromAccountId,
    toAccountId,
    amount,
    onFromChange,
    onToChange,
    onAmountChange,
    disabled,
}: TransferFieldsProps) {
    const [pickerOpen, setPickerOpen] = useState<'from' | 'to' | null>(null)

    const fromAccount = accounts.find((a) => a.id === fromAccountId)
    const toAccount = accounts.find((a) => a.id === toAccountId)
    const parsedAmount = parseCurrencyInput(amount)

    const previewFrom = fromAccount && amount !== '' ? fromAccount.balance - parsedAmount : null
    const previewTo = toAccount && amount !== '' ? toAccount.balance + parsedAmount : null

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setPickerOpen('from')}
                    className="flex items-center gap-2.5 py-[13px] text-left w-full disabled:opacity-50 disabled:pointer-events-none"
                >
                    <Wallet className="w-4 h-4 text-[#8a8a84] shrink-0" strokeWidth={2} />
                    <span className="text-[13px] text-[#8a8a84] shrink-0">From</span>
                    <span className="ml-auto flex items-center gap-1.5 min-w-0">
                        <span className="flex flex-col items-end min-w-0">
                            <span className="text-[13.5px] font-medium text-[#252525] truncate max-w-[160px]">
                                {fromAccount?.name ?? 'Select account'}
                            </span>
                            {fromAccount && (
                                <span className="text-[11.5px] text-[#b0b0aa]">{formatCurrency(fromAccount.balance)}</span>
                            )}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#a3a3a3] shrink-0" />
                    </span>
                </button>

                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setPickerOpen('to')}
                    className="flex items-center gap-2.5 py-[13px] border-t border-[#f2f2f0] text-left w-full disabled:opacity-50 disabled:pointer-events-none"
                >
                    <Wallet className="w-4 h-4 text-[#8a8a84] shrink-0" strokeWidth={2} />
                    <span className="text-[13px] text-[#8a8a84] shrink-0">To</span>
                    <span className="ml-auto flex items-center gap-1.5 min-w-0">
                        <span className="flex flex-col items-end min-w-0">
                            <span className="text-[13.5px] font-medium text-[#252525] truncate max-w-[160px]">
                                {toAccount?.name ?? 'Select account'}
                            </span>
                            {toAccount && (
                                <span className="text-[11.5px] text-[#b0b0aa]">{formatCurrency(toAccount.balance)}</span>
                            )}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#a3a3a3] shrink-0" />
                    </span>
                </button>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Amount</Label>
                <div className="flex items-baseline gap-1.5 border-b border-[#e5e5e5] pb-2">
                    <span className="text-[20px] font-medium text-[#b0b0aa]">Rp</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => onAmountChange(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        placeholder="0"
                        disabled={disabled}
                        className="flex-1 min-w-0 bg-transparent outline-none text-[34px] font-medium tracking-[-0.02em] text-[#252525] placeholder:text-[#b0b0aa]"
                    />
                </div>
            </div>

            {amount !== '' && (previewFrom !== null || previewTo !== null) && (
                <div className="flex flex-col gap-1 px-3 py-2.5 rounded-[14px] bg-[#f4f4f2] border border-[#e5e5e5]">
                    <p className="text-[10px] uppercase tracking-[.14em] text-[#8a8a84] font-medium mb-0.5">After transfer</p>
                    {fromAccount && previewFrom !== null && (
                        <div className="flex items-center justify-between">
                            <span className="text-[11.5px] text-[#8a8a84] truncate max-w-[160px]">{fromAccount.name}</span>
                            <span className={cn('text-[11.5px] font-semibold', previewFrom < 0 ? 'text-[#dc2626]' : 'text-[#252525]')}>
                                {formatCurrency(previewFrom)}
                            </span>
                        </div>
                    )}
                    {toAccount && previewTo !== null && (
                        <div className="flex items-center justify-between">
                            <span className="text-[11.5px] text-[#8a8a84] truncate max-w-[160px]">{toAccount.name}</span>
                            <span className="text-[11.5px] font-semibold text-[#059669]">
                                {formatCurrency(previewTo)}
                            </span>
                        </div>
                    )}
                </div>
            )}

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
