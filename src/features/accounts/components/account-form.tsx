import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, ArrowRight, Check } from 'lucide-react'
import { AccountTypeIcon, AccountTypeTile } from '@/components/account-type-icon'
import { ACCOUNT_TILE_CLASS } from '@/lib/account-tiles'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, parseCurrencyWithSign, toSignedDigits } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types'
import { toast } from 'sonner'

interface AccountFormProps {
    onSuccess: () => void
    initial?: Account
    allAccounts?: Account[]
    /** Which tab an edit opens on (e.g. Transfer from the account detail sheet). */
    initialTab?: Tab
}

type Tab = 'edit' | 'transfer'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

export function AccountForm({ onSuccess, initial, allAccounts = [], initialTab = 'edit' }: AccountFormProps) {
    const isEdit = !!initial

    const [tab, setTab] = useState<Tab>(initialTab)
    const [name, setName] = useState(initial?.name ?? '')
    const [type, setType] = useState<AccountType>((initial?.type as AccountType) ?? 'bank')
    const [isSavings, setIsSavings] = useState(initial?.is_savings ?? false)
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
            const { error } = await accountsService.update(initial.id, { name, type, is_savings: isSavings })
            const { error: adjError } = !error && adjustment !== '' && parsedAdj !== 0
                ? await accountsService.adjustBalance(initial.id, parsedAdj)
                : { error: null }
            setLoading(false)
            if (error || adjError) { toast.error((error || adjError)!); return }
            toast.success('Account updated.')
        } else {
            if (isNaN(parsedInitial) || parsedInitial < 0) { toast.error('Invalid balance.'); return }
            setLoading(true)
            const { error } = await accountsService.create({ name, type, initial_balance: parsedInitial, is_savings: isSavings })
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
                <div className="relative flex rounded-[14px] bg-surface-hover p-1 gap-1">
                    {/* sliding indicator */}
                    <div
                        className={cn(
                            'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[10px] bg-raised shadow-sm transition-transform duration-200 ease-out',
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
                                tab === t ? 'text-ink font-semibold' : 'text-muted-ink font-medium'
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
                                        ? 'border-brand bg-brand-tint'
                                        : 'border-line bg-surface hover:border-line-strong'
                                )}
                            >
                                <div className={cn(
                                    'w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0',
                                    type === 'bank' ? ACCOUNT_TILE_CLASS.bank : 'bg-surface-hover'
                                )}>
                                    <AccountTypeIcon type="bank" className={cn('w-6 h-6 transition-all', type !== 'bank' && 'opacity-60 grayscale')} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold leading-none mb-0.5 text-ink">
                                        Bank
                                    </p>
                                    <p className={cn('text-[11px]', type === 'bank' ? 'text-brand-ink' : 'text-muted-ink')}>
                                        BCA, Mandiri, BNI…
                                    </p>
                                </div>
                                {type === 'bank' && (
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand flex items-center justify-center">
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
                                        ? 'border-brand bg-brand-tint'
                                        : 'border-line bg-surface hover:border-line-strong'
                                )}
                            >
                                <div className={cn(
                                    'w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0',
                                    type === 'cash' ? ACCOUNT_TILE_CLASS.cash : 'bg-surface-hover'
                                )}>
                                    <AccountTypeIcon type="cash" className={cn('w-6 h-6 transition-all', type !== 'cash' && 'opacity-60 grayscale')} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold leading-none mb-0.5 text-ink">
                                        Cash
                                    </p>
                                    <p className={cn('text-[11px]', type === 'cash' ? 'text-brand-ink' : 'text-muted-ink')}>
                                        Physical cash
                                    </p>
                                </div>
                                {type === 'cash' && (
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand flex items-center justify-center">
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
                            className="h-12 rounded-[14px] border-line text-[13px]"
                        />
                    </div>

                    <label className="flex items-center gap-3 px-3 py-3 rounded-[14px] border border-line cursor-pointer">
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-ink">Savings account</p>
                            <p className="text-[11px] text-muted-ink leading-snug mt-0.5">
                                Money moved in counts as saved, not spendable.
                            </p>
                        </div>
                        <Switch checked={isSavings} onCheckedChange={setIsSavings} disabled={loading} />
                    </label>

                    {!isEdit && (
                        <div className="flex flex-col gap-2">
                            <Label className={FIELD_LABEL}>
                                Current balance
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-ink font-medium">Rp</span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    className="pl-10 h-12 rounded-[14px] border-line text-[13px] font-mono"
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
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-ink font-medium">Rp</span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 50.000 or -20.000"
                                    className="pl-10 pr-14 h-12 rounded-[14px] border-line text-[13px] font-mono"
                                    value={formatCurrencyInput(adjustment)}
                                    onChange={e => setAdjustment(toSignedDigits(e.target.value))}
                                    disabled={loading}
                                />
                                {/* Number keypads on phones often have no minus key. */}
                                <button
                                    type="button"
                                    onClick={() => setAdjustment(a => a.startsWith('-') ? a.slice(1) : '-' + a)}
                                    disabled={loading}
                                    aria-label={adjustment.startsWith('-') ? 'Make positive' : 'Make negative'}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 min-w-10 px-2 rounded-[10px] bg-surface-hover text-[13px] font-semibold font-mono text-[#5b5b55] dark:text-neutral-300 hover:bg-surface-hover transition-colors disabled:opacity-50"
                                >
                                    +/−
                                </button>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-surface-hover">
                                <span className="text-[11.5px] text-muted-ink">Balance</span>
                                <span className="text-[12px] font-semibold text-ink font-mono ml-auto">
                                    {formatCurrency(initial.balance)}
                                </span>
                                {previewBalance !== null && (
                                    <>
                                        <ArrowRight className="w-3 h-3 text-muted-ink shrink-0" />
                                        <span className={cn(
                                            'text-[12px] font-semibold font-mono',
                                            previewBalance < 0 ? 'text-negative' : 'text-positive'
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
                        <div className="flex-1 flex flex-col gap-0.5 px-3 py-2.5 rounded-[14px] bg-surface-hover border border-line">
                            <span className="text-[10px] uppercase tracking-[.14em] text-muted-ink font-medium">From</span>
                            <span className="text-[13px] font-semibold text-ink truncate">{initial.name}</span>
                            <span className="text-[11px] text-muted-ink font-mono">{formatCurrency(initial.balance)}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-surface-hover border border-line flex items-center justify-center shrink-0">
                            <ArrowRight className="w-3.5 h-3.5 text-muted-ink" />
                        </div>
                        <div className={cn(
                            'flex-1 flex flex-col gap-0.5 px-3 py-2.5 rounded-[14px] border transition-colors',
                            toAccount
                                ? 'bg-brand-tint border-brand-line'
                                : 'bg-surface-hover border-line border-dashed'
                        )}>
                            <span className="text-[10px] uppercase tracking-[.14em] text-muted-ink font-medium">To</span>
                            {toAccount
                                ? <>
                                    <span className="text-[13px] font-semibold text-brand-ink truncate">{toAccount.name}</span>
                                    <span className="text-[11px] text-brand-ink font-mono">{formatCurrency(toAccount.balance)}</span>
                                </>
                                : <span className="text-[13px] text-muted-ink italic">Select below</span>
                            }
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className={FIELD_LABEL}>
                            Destination account
                        </Label>
                        {transferTargets.length === 0
                            ? <p className="text-[13px] text-muted-ink py-1">No other accounts available.</p>
                            : (
                                <div className="flex flex-col gap-1.5">
                                    {transferTargets.map(acc => {
                                        const selected = toAccountId === acc.id
                                        return (
                                            <button
                                                key={acc.id}
                                                type="button"
                                                onClick={() => setToAccountId(acc.id)}
                                                className={cn(
                                                    'flex items-center gap-3 px-3 py-2.5 rounded-[14px] border-[1.5px] text-left transition-all duration-150',
                                                    selected
                                                        ? 'border-brand bg-brand-tint'
                                                        : 'border-line bg-surface hover:border-line-strong'
                                                )}
                                            >
                                                <AccountTypeTile type={acc.type} savings={acc.is_savings} className="w-8 h-8" />
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn('text-[13px] font-semibold truncate', selected ? 'text-ink' : 'text-ink')}>
                                                        {acc.name}
                                                    </p>
                                                    <p className={cn('text-[11px] font-mono', selected ? 'text-brand-ink' : 'text-muted-ink')}>
                                                        {formatCurrency(acc.balance)}
                                                    </p>
                                                </div>
                                                {selected && (
                                                    <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0">
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
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-ink font-medium">Rp</span>
                            <Input
                                type="text"
                                inputMode="numeric"
                                className="pl-10 h-12 rounded-[14px] border-line text-[13px] font-mono"
                                placeholder="0"
                                value={formatCurrencyInput(transferAmount)}
                                onChange={e => setTransferAmount(e.target.value.replace(/\D/g, ''))}
                                disabled={loading}
                            />
                        </div>

                        {transferAmount !== '' && (previewFrom !== null || previewTo !== null) && (
                            <div className="flex flex-col gap-1 px-3 py-2.5 rounded-[14px] bg-surface-hover border border-line">
                                <p className="text-[10px] uppercase tracking-[.14em] text-muted-ink font-medium mb-0.5">After transfer</p>
                                {previewFrom !== null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11.5px] text-muted-ink truncate max-w-[120px]">{initial.name}</span>
                                        <span className={cn('text-[11.5px] font-semibold font-mono', previewFrom < 0 ? 'text-negative' : 'text-ink')}>
                                            {formatCurrency(previewFrom)}
                                        </span>
                                    </div>
                                )}
                                {toAccount && previewTo !== null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11.5px] text-muted-ink truncate max-w-[120px]">{toAccount.name}</span>
                                        <span className="text-[11.5px] font-semibold font-mono text-positive">
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
