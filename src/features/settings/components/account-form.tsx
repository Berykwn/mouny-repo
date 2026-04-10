import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, parseCurrencyWithSign } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types'
import { toast } from 'sonner'

interface AccountFormProps {
    onSuccess: () => void
    initial?: Account
}

const ACCOUNT_TYPES: { value: AccountType; label: string; desc: string }[] = [
    { value: 'bank', label: 'Bank Account', desc: 'BCA, Mandiri, BNI, etc.' },
    { value: 'cash', label: 'Cash', desc: 'Physical cash' },
]

export function AccountForm({ onSuccess, initial }: AccountFormProps) {
    const isEdit = !!initial

    const [name, setName] = useState(initial?.name ?? '')
    const [type, setType] = useState<AccountType>((initial?.type as AccountType) ?? 'bank')

    const [initialBalance, setInitialBalance] = useState('')
    const [adjustment, setAdjustment] = useState('')

    const [loading, setLoading] = useState(false)

    const parsedInitial = parseCurrencyInput(initialBalance)
    const parsedAdj = parseCurrencyWithSign(adjustment)

    const previewBalance =
        initial && adjustment !== ''
            ? initial.balance + parsedAdj
            : null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (isEdit) {
            if (adjustment !== '' && isNaN(parsedAdj)) {
                toast.error('Invalid adjustment value.')
                return
            }

            setLoading(true)
            const { error } = await accountsService.update(initial.id, {
                name,
                type,
                balance_adjustment: parsedAdj,
            })
            setLoading(false)

            if (error) {
                toast.error(error)
                return
            }

            toast.success('Account updated successfully.')
        } else {
            if (isNaN(parsedInitial) || parsedInitial < 0) {
                toast.error('Invalid balance.')
                return
            }

            setLoading(true)
            const { error } = await accountsService.create({
                name,
                type,
                initial_balance: parsedInitial
            })
            setLoading(false)

            if (error) {
                toast.error(error)
                return
            }

            toast.success('Account created successfully.')
        }

        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">

            {/* ACCOUNT TYPE */}
            <div className="space-y-2">
                <Label>Account type</Label>
                <div className="grid grid-cols-2 gap-2">
                    {ACCOUNT_TYPES.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setType(t.value)}
                            className={cn(
                                'flex flex-col items-start p-3 rounded-lg border text-left transition-colors',
                                type === t.value
                                    ? 'bg-yellow-100 text-yellow-600 border-yellow-200'
                                    : 'text-muted-foreground hover:text-foreground border-border'
                            )}
                        >
                            <span className="text-sm font-medium">{t.label}</span>
                            <span className={cn(
                                'text-xs mt-0.5',
                                type === t.value ? 'text-yellow-600/70' : 'text-muted-foreground'
                            )}>
                                {t.desc}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* NAME */}
            <div className="space-y-2">
                <Label>Account name</Label>
                <Input
                    placeholder={type === 'bank' ? 'BCA, Mandiri, BNI...' : 'Wallet, Petty cash...'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            {/* INITIAL BALANCE */}
            {!isEdit && (
                <div className="space-y-2">
                    <Label>Current balance</Label>

                    <div className='relative'>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            Rp.
                        </span>
                        <Input
                            type="text"
                            inputMode="numeric"
                            className="pl-9"
                            placeholder="0"
                            value={formatCurrencyInput(initialBalance)}
                            onChange={(e) =>
                                setInitialBalance(e.target.value.replace(/\D/g, ''))
                            }
                            disabled={loading}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Enter your current account or cash balance.
                    </p>
                </div>
            )}

            {isEdit && (
                <div className="space-y-2">
                    <Label>Balance adjustment</Label>
                    <div className='relative'>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            Rp.
                        </span>

                        <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 50000 or -20000"
                            className='pl-9'
                            value={formatCurrencyInput(adjustment)}
                            onChange={(e) =>
                                setAdjustment(e.target.value.replace(/[^0-9,-]/g, ''))
                            }
                            disabled={loading}
                        />
                    </div>


                    <p className="text-xs text-muted-foreground">
                        Current balance:{' '}
                        <span className="font-medium text-foreground">
                            {formatCurrency(initial.balance)}
                        </span>

                        {previewBalance !== null && adjustment !== '' && (
                            <>
                                {' '}→{' '}
                                <span className={cn(
                                    'font-medium',
                                    previewBalance < 0 ? 'text-destructive' : 'text-foreground'
                                )}>
                                    {formatCurrency(previewBalance)}
                                </span>
                            </>
                        )}
                    </p>
                </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
                {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isEdit ? 'Save Changes' : 'Add Account'
                }
            </Button>
        </form>
    )
}