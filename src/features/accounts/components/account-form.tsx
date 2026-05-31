import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, Building2, Wallet, Check } from 'lucide-react'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, parseCurrencyWithSign } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface AccountFormProps {
    onSuccess: () => void
    initial?: Account
    allAccounts?: Account[]
}

type Tab = 'edit' | 'transfer'

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
                <div className="relative flex rounded-xl bg-muted p-1 gap-1">
                    {/* sliding indicator */}
                    <div
                        className={cn(
                            'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-background shadow-sm transition-transform duration-200 ease-out',
                            tab === 'transfer' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                        )}
                    />
                    {(['edit', 'transfer'] as Tab[]).map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={cn(
                                'relative z-10 flex-1 py-2 text-[13px] font-medium rounded-lg transition-colors duration-150',
                                tab === t ? 'text-foreground' : 'text-muted-foreground'
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
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                            Account type
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setType('bank')}
                                className={cn(
                                    'relative flex items-center gap-3 px-3 py-3 rounded-xl border-[1.5px] text-left transition-all duration-150',
                                    type === 'bank'
                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                                        : 'border-border bg-background hover:border-muted-foreground/30'
                                )}
                            >
                                <div className={cn(
                                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                    type === 'bank' ? 'bg-amber-200 dark:bg-amber-800' : 'bg-muted'
                                )}>
                                    <Building2 className={cn('w-4 h-4', type === 'bank' ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')} />
                                </div>
                                <div>
                                    <p className={cn('text-sm font-semibold leading-none mb-0.5', type === 'bank' ? 'text-amber-800 dark:text-amber-200' : 'text-foreground')}>
                                        Bank
                                    </p>
                                    <p className={cn('text-[11px]', type === 'bank' ? 'text-amber-600/80 dark:text-amber-400/80' : 'text-muted-foreground')}>
                                        BCA, Mandiri, BNI…
                                    </p>
                                </div>
                                {type === 'bank' && (
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setType('cash')}
                                className={cn(
                                    'relative flex items-center gap-3 px-3 py-3 rounded-xl border-[1.5px] text-left transition-all duration-150',
                                    type === 'cash'
                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                                        : 'border-border bg-background hover:border-muted-foreground/30'
                                )}
                            >
                                <div className={cn(
                                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                    type === 'cash' ? 'bg-amber-200 dark:bg-amber-800' : 'bg-muted'
                                )}>
                                    <Wallet className={cn('w-4 h-4', type === 'cash' ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')} />
                                </div>
                                <div>
                                    <p className={cn('text-sm font-semibold leading-none mb-0.5', type === 'cash' ? 'text-amber-800 dark:text-amber-200' : 'text-foreground')}>
                                        Cash
                                    </p>
                                    <p className={cn('text-[11px]', type === 'cash' ? 'text-amber-600/80 dark:text-amber-400/80' : 'text-muted-foreground')}>
                                        Physical cash
                                    </p>
                                </div>
                                {type === 'cash' && (
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                            Account name
                        </Label>
                        <Input
                            placeholder={type === 'bank' ? 'e.g. BCA, Mandiri…' : 'e.g. Wallet, Petty cash…'}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            disabled={loading}
                            className="h-11 text-sm"
                        />
                    </div>

                    {!isEdit && (
                        <div className="flex flex-col gap-2">
                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                                Current balance
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    className="pl-10 h-11 text-sm font-mono"
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
                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                                Balance adjustment
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 50.000 or -20.000"
                                    className="pl-10 h-11 text-sm font-mono"
                                    value={formatCurrencyInput(adjustment)}
                                    onChange={e => setAdjustment(e.target.value.replace(/[^0-9,-]/g, ''))}
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60">
                                <span className="text-xs text-muted-foreground">Balance</span>
                                <span className="text-xs font-semibold text-foreground font-mono ml-auto">
                                    {formatCurrency(initial.balance)}
                                </span>
                                {previewBalance !== null && (
                                    <>
                                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                        <span className={cn(
                                            'text-xs font-semibold font-mono',
                                            previewBalance < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                                        )}>
                                            {formatCurrency(previewBalance)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl text-sm font-semibold"
                    >
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : isEdit ? 'Save changes' : 'Add account'
                        }
                    </Button>
                </form>
            )}

            {tab === 'transfer' && initial && (
                <form onSubmit={handleTransferSubmit} className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex flex-col gap-0.5 px-3 py-2.5 rounded-xl bg-muted/60 border border-border">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">From</span>
                            <span className="text-sm font-semibold text-foreground truncate">{initial.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{formatCurrency(initial.balance)}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className={cn(
                            'flex-1 flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border transition-colors',
                            toAccount
                                ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700'
                                : 'bg-muted/60 border-border border-dashed'
                        )}>
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">To</span>
                            {toAccount
                                ? <>
                                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-200 truncate">{toAccount.name}</span>
                                    <span className="text-xs text-amber-600/80 dark:text-amber-400/80 font-mono">{formatCurrency(toAccount.balance)}</span>
                                </>
                                : <span className="text-sm text-muted-foreground italic">Select below</span>
                            }
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                            Destination account
                        </Label>
                        {transferTargets.length === 0
                            ? <p className="text-sm text-muted-foreground py-1">No other accounts available.</p>
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
                                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border-[1.5px] text-left transition-all duration-150',
                                                    selected
                                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                                                        : 'border-border bg-background hover:border-muted-foreground/30'
                                                )}
                                            >
                                                <div className={cn(
                                                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                                    selected ? 'bg-amber-200 dark:bg-amber-800' : 'bg-muted'
                                                )}>
                                                    <Icon className={cn('w-4 h-4', selected ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn('text-sm font-semibold truncate', selected ? 'text-amber-800 dark:text-amber-200' : 'text-foreground')}>
                                                        {acc.name}
                                                    </p>
                                                    <p className={cn('text-xs font-mono', selected ? 'text-amber-600/80' : 'text-muted-foreground')}>
                                                        {formatCurrency(acc.balance)}
                                                    </p>
                                                </div>
                                                {selected && (
                                                    <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
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
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                            Amount
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                            <Input
                                type="text"
                                inputMode="numeric"
                                className="pl-10 h-11 text-sm font-mono"
                                placeholder="0"
                                value={formatCurrencyInput(transferAmount)}
                                onChange={e => setTransferAmount(e.target.value.replace(/\D/g, ''))}
                                disabled={loading}
                            />
                        </div>

                        {transferAmount !== '' && (previewFrom !== null || previewTo !== null) && (
                            <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-muted/50 border border-border">
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">After transfer</p>
                                {previewFrom !== null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{initial.name}</span>
                                        <span className={cn('text-xs font-semibold font-mono', previewFrom < 0 ? 'text-destructive' : 'text-foreground')}>
                                            {formatCurrency(previewFrom)}
                                        </span>
                                    </div>
                                )}
                                {toAccount && previewTo !== null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{toAccount.name}</span>
                                        <span className="text-xs font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(previewTo)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || transferTargets.length === 0}
                        className="w-full h-12 rounded-xl text-sm font-semibold"
                    >
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <>Transfer <ArrowRight className="w-4 h-4" /></>
                        }
                    </Button>
                </form>
            )}
        </div>
    )
}