import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, Building2, Wallet, Check } from 'lucide-react'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, parseCurrencyWithSign } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types'
import { toast } from 'sonner'

interface AccountFormProps {
    onSuccess: () => void
    initial?: Account
    allAccounts?: Account[]
}

type Tab = 'edit' | 'transfer'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

export function AccountForm({ onSuccess, initial, allAccounts = [] }: AccountFormProps) {
    const isEdit = !!initial

    const [tab, setTab] = useState<Tab>('edit')
    const [name, setName] = useState(initial?.name ?? '')
    const [type, setType] = useState<AccountType>((initial?.type as AccountType) ?? 'bank')
    const [initialBalance, setInitialBalance] = useState('')
    const [adjustment, setAdjustment] = useState('')
    const [toAccountId, setToAccountId] = useState('')
    const [transferAmount, setTransferAmount] = useState('')
    const [loading, setLoading] = useState(false)

    const transferTargets = allAccounts.filter(a => a.id !== initial?.id)
    const toAccount = transferTargets.find(a => a.id === toAccountId)

    const parsedInitial = parseCurrencyInput(initialBalance)
    const parsedAdj = parseCurrencyWithSign(adjustment)
    const parsedTransfer = parseCurrencyInput(transferAmount)

    const previewBalance = initial && adjustment !== '' ? initial.balance + parsedAdj : null
    const previewFrom = initial && transferAmount !== '' ? initial.balance - parsedTransfer : null
    const previewTo = toAccount && transferAmount !== '' ? toAccount.balance + parsedTransfer : null

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isEdit) {
            if (adjustment !== '' && isNaN(parsedAdj)) { toast.error('Invalid adjustment value.'); return }
            setLoading(true)
            const { error } = await accountsService.update(initial.id, { name, type, balance_adjustment: parsedAdj })
            setLoading(false)
            if (error) { toast.error(error); return }
            toast.success('Account updated.')
        } else {
            if (isNaN(parsedInitial) || parsedInitial < 0) { toast.error('Invalid balance.'); return }
            setLoading(true)
            const { error } = await accountsService.create({ name, type, initial_balance: parsedInitial })
            setLoading(false)
            if (error) { toast.error(error); return }
            toast.success('Account created.')
        }
        onSuccess()
    }

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!toAccountId) { toast.error('Select a destination account.'); return }
        if (isNaN(parsedTransfer) || parsedTransfer <= 0) { toast.error('Enter a valid amount.'); return }
        if (initial && parsedTransfer > initial.balance) { toast.error('Insufficient balance.'); return }
        setLoading(true)
        const { error } = await accountsService.transfer(initial!.id, toAccountId, parsedTransfer)
        setLoading(false)
        if (error) { toast.error(error); return }
        toast.success(`Transferred ${formatCurrency(parsedTransfer)} to ${toAccount?.name}.`)
        onSuccess()
    }

    return (
        <div className="flex flex-col gap-5 pb-2">

            {isEdit && (
                <div className="relative flex rounded-[14px] bg-[#f4f4f2] p-1 gap-1">
                    {/* sliding indicator */}
                    <div
                        className={cn(
                            'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[10px] bg-white shadow-sm transition-transform duration-200 ease-out',
                            tab === 'transfer' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                        )}
                    />
                    {(['edit', 'transfer'] as Tab[]).map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={cn(
                                'relative z-10 flex-1 py-2 text-[13px] rounded-[10px] transition-colors duration-150',
                                tab === t ? 'text-[#252525] font-semibold' : 'text-[#8a8a84] font-medium'
                            )}
                        >
                            {t === 'edit' ? 'Edit account' : '⇄  Transfer'}
                        </button>
                    ))}
                </div>
            )}

            {tab === 'edit' && (
                <form onSubmit={handleEditSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <Label className={FIELD_LABEL}>
                            Account type
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setType('bank')}
                                className={cn(
                                    'relative flex items-center gap-3 px-3 py-3 rounded-[14px] border-[1.5px] text-left transition-all duration-150',
                                    type === 'bank'
                                        ? 'border-[#6FA82B] bg-[#f2f6ea]'
                                        : 'border-[#e5e5e5] bg-white hover:border-[#d4d4d4]'
                                )}
                            >
                                <div className={cn(
                                    'w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0',
                                    type === 'bank' ? 'bg-[#6FA82B]/15' : 'bg-[#f4f4f2]'
                                )}>
                                    <Building2 className={cn('w-4 h-4', type === 'bank' ? 'text-[#4d7a1d]' : 'text-[#8a8a84]')} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold leading-none mb-0.5 text-[#252525]">
                                        Bank
                                    </p>
                                    <p className={cn('text-[11px]', type === 'bank' ? 'text-[#4d7a1d]' : 'text-[#8a8a84]')}>
                                        BCA, Mandiri, BNI…
                                    </p>
                                </div>
                                {type === 'bank' && (
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#6FA82B] flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setType('cash')}
                                className={cn(
                                    'relative flex items-center gap-3 px-3 py-3 rounded-[14px] border-[1.5px] text-left transition-all duration-150',
                                    type === 'cash'
                                        ? 'border-[#6FA82B] bg-[#f2f6ea]'
                                        : 'border-[#e5e5e5] bg-white hover:border-[#d4d4d4]'
                                )}
                            >
                                <div className={cn(
                                    'w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0',
                                    type === 'cash' ? 'bg-[#6FA82B]/15' : 'bg-[#f4f4f2]'
                                )}>
                                    <Wallet className={cn('w-4 h-4', type === 'cash' ? 'text-[#4d7a1d]' : 'text-[#8a8a84]')} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold leading-none mb-0.5 text-[#252525]">
                                        Cash
                                    </p>
                                    <p className={cn('text-[11px]', type === 'cash' ? 'text-[#4d7a1d]' : 'text-[#8a8a84]')}>
                                        Physical cash
                                    </p>
                                </div>
                                {type === 'cash' && (
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#6FA82B] flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className={FIELD_LABEL}>
                            Account name
                        </Label>
                        <Input
                            placeholder={type === 'bank' ? 'e.g. BCA, Mandiri…' : 'e.g. Wallet, Petty cash…'}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            disabled={loading}
                            className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                        />
                    </div>

                    {!isEdit && (
                        <div className="flex flex-col gap-2">
                            <Label className={FIELD_LABEL}>
                                Current balance
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a84] font-medium">Rp</span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    className="pl-10 h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                                    placeholder="0"
                                    value={formatCurrencyInput(initialBalance)}
                                    onChange={e => setInitialBalance(e.target.value.replace(/\D/g, ''))}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    )}

                    {isEdit && (
                        <div className="flex flex-col gap-2">
                            <Label className={FIELD_LABEL}>
                                Balance adjustment
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a84] font-medium">Rp</span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 50.000 or -20.000"
                                    className="pl-10 h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                                    value={formatCurrencyInput(adjustment)}
                                    onChange={e => setAdjustment(e.target.value.replace(/[^0-9,-]/g, ''))}
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-[#f4f4f2]">
                                <span className="text-[11.5px] text-[#8a8a84]">Balance</span>
                                <span className="text-[12px] font-semibold text-[#252525] font-mono ml-auto">
                                    {formatCurrency(initial.balance)}
                                </span>
                                {previewBalance !== null && (
                                    <>
                                        <ArrowRight className="w-3 h-3 text-[#8a8a84] shrink-0" />
                                        <span className={cn(
                                            'text-[12px] font-semibold font-mono',
                                            previewBalance < 0 ? 'text-[#dc2626]' : 'text-[#059669]'
                                        )}>
                                            {formatCurrency(previewBalance)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <button type="submit" disabled={loading} className={SUBMIT_BUTTON}>
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            : isEdit ? 'Save changes' : 'Add account'
                        }
                    </button>
                </form>
            )}

            {tab === 'transfer' && initial && (
                <form onSubmit={handleTransferSubmit} className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex flex-col gap-0.5 px-3 py-2.5 rounded-[14px] bg-[#f4f4f2] border border-[#e5e5e5]">
                            <span className="text-[10px] uppercase tracking-[.14em] text-[#8a8a84] font-medium">From</span>
                            <span className="text-[13px] font-semibold text-[#252525] truncate">{initial.name}</span>
                            <span className="text-[11px] text-[#8a8a84] font-mono">{formatCurrency(initial.balance)}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#f4f4f2] border border-[#e5e5e5] flex items-center justify-center shrink-0">
                            <ArrowRight className="w-3.5 h-3.5 text-[#8a8a84]" />
                        </div>
                        <div className={cn(
                            'flex-1 flex flex-col gap-0.5 px-3 py-2.5 rounded-[14px] border transition-colors',
                            toAccount
                                ? 'bg-[#f2f6ea] border-[#cfdcb8]'
                                : 'bg-[#f4f4f2] border-[#e5e5e5] border-dashed'
                        )}>
                            <span className="text-[10px] uppercase tracking-[.14em] text-[#8a8a84] font-medium">To</span>
                            {toAccount
                                ? <>
                                    <span className="text-[13px] font-semibold text-[#4d7a1d] truncate">{toAccount.name}</span>
                                    <span className="text-[11px] text-[#4d7a1d] font-mono">{formatCurrency(toAccount.balance)}</span>
                                </>
                                : <span className="text-[13px] text-[#8a8a84] italic">Select below</span>
                            }
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className={FIELD_LABEL}>
                            Destination account
                        </Label>
                        {transferTargets.length === 0
                            ? <p className="text-[13px] text-[#8a8a84] py-1">No other accounts available.</p>
                            : (
                                <div className="flex flex-col gap-1.5">
                                    {transferTargets.map(acc => {
                                        const Icon = acc.type === 'bank' ? Building2 : Wallet
                                        const selected = toAccountId === acc.id
                                        return (
                                            <button
                                                key={acc.id}
                                                type="button"
                                                onClick={() => setToAccountId(acc.id)}
                                                className={cn(
                                                    'flex items-center gap-3 px-3 py-2.5 rounded-[14px] border-[1.5px] text-left transition-all duration-150',
                                                    selected
                                                        ? 'border-[#6FA82B] bg-[#f2f6ea]'
                                                        : 'border-[#e5e5e5] bg-white hover:border-[#d4d4d4]'
                                                )}
                                            >
                                                <div className={cn(
                                                    'w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0',
                                                    selected ? 'bg-[#6FA82B]/15' : 'bg-[#f4f4f2]'
                                                )}>
                                                    <Icon className={cn('w-4 h-4', selected ? 'text-[#4d7a1d]' : 'text-[#8a8a84]')} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn('text-[13px] font-semibold truncate', selected ? 'text-[#252525]' : 'text-[#252525]')}>
                                                        {acc.name}
                                                    </p>
                                                    <p className={cn('text-[11px] font-mono', selected ? 'text-[#4d7a1d]' : 'text-[#8a8a84]')}>
                                                        {formatCurrency(acc.balance)}
                                                    </p>
                                                </div>
                                                {selected && (
                                                    <div className="w-5 h-5 rounded-full bg-[#6FA82B] flex items-center justify-center shrink-0">
                                                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )
                        }
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className={FIELD_LABEL}>
                            Amount
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a84] font-medium">Rp</span>
                            <Input
                                type="text"
                                inputMode="numeric"
                                className="pl-10 h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                                placeholder="0"
                                value={formatCurrencyInput(transferAmount)}
                                onChange={e => setTransferAmount(e.target.value.replace(/\D/g, ''))}
                                disabled={loading}
                            />
                        </div>

                        {transferAmount !== '' && (previewFrom !== null || previewTo !== null) && (
                            <div className="flex flex-col gap-1 px-3 py-2.5 rounded-[14px] bg-[#f4f4f2] border border-[#e5e5e5]">
                                <p className="text-[10px] uppercase tracking-[.14em] text-[#8a8a84] font-medium mb-0.5">After transfer</p>
                                {previewFrom !== null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11.5px] text-[#8a8a84] truncate max-w-[120px]">{initial.name}</span>
                                        <span className={cn('text-[11.5px] font-semibold font-mono', previewFrom < 0 ? 'text-[#dc2626]' : 'text-[#252525]')}>
                                            {formatCurrency(previewFrom)}
                                        </span>
                                    </div>
                                )}
                                {toAccount && previewTo !== null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11.5px] text-[#8a8a84] truncate max-w-[120px]">{toAccount.name}</span>
                                        <span className="text-[11.5px] font-semibold font-mono text-[#059669]">
                                            {formatCurrency(previewTo)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || transferTargets.length === 0}
                        className={cn(SUBMIT_BUTTON, 'flex items-center justify-center gap-2')}
                    >
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <>Transfer <ArrowRight className="w-4 h-4" /></>
                        }
                    </button>
                </form>
            )}
        </div>
    )
}
