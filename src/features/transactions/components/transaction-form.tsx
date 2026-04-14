import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { transactionsService, type CreateTransactionInput } from '@/services/transactions.service'
import { accountsService, categoriesService } from '@/services/accounts-categories.service'
import { toISODate } from '@/lib/helpers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select'
import type { Account, Category } from '@/types'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toast } from 'sonner'

interface TransactionFormProps {
    payPeriodId: string
    periodStart: string
    periodEnd?: string
    onSuccess: () => void
}

type TxType = 'income' | 'expense'

export function TransactionForm({ payPeriodId, periodStart, periodEnd, onSuccess }: TransactionFormProps) {
    const today = toISODate()
    const maxDate = periodEnd ?? today

    // Default date: clamp today into period range
    const defaultDate = today > maxDate ? maxDate : today < periodStart ? periodStart : today

    const [type, setType] = useState<TxType>('expense')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [date, setDate] = useState(defaultDate)
    const [accountId, setAccountId] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        accountsService.getAll().then(({ data }) => {
            if (data) {
                setAccounts(data)
                setAccountId(data[0]?.id ?? '')
            }
        })
    }, [])

    useEffect(() => {
        categoriesService.getByType(type).then(({ data }) => {
            if (data && data.length > 0) {
                setCategories(data)
                setCategoryId(data[0].id)
            } else {
                setCategories([])
                setCategoryId('')
            }
        })
    }, [type])

    const handleAmountChange = (raw: string) => {
        setAmount(raw.replace(/\D/g, ''))
    }

    const displayAmount = amount ? Number(amount).toLocaleString('id-ID') : ''

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsed = parseInt(amount, 10)
        if (!amount || isNaN(parsed) || parsed <= 0) {
            toast.error('Invalid amount.')
            return
        }
        if (!accountId) {
            toast.error('Please select an account.')
            return
        }
        if (!categoryId) {
            toast.error('Please select a category.')
            return
        }
        if (date < periodStart) {
            toast.error(`Date cannot be before period start (${periodStart}).`)
            return
        }
        if (date > maxDate) {
            toast.error(`Date cannot be after period end (${maxDate}).`)
            return
        }

        setLoading(true)
        const input: CreateTransactionInput = {
            pay_period_id: payPeriodId,
            account_id: accountId,
            category_id: categoryId === 'none' ? undefined : categoryId,
            type,
            amount: parsed,
            note: note || undefined,
            date,
        }

        const { error } = await transactionsService.create(input)

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success('Transaction saved successfully.')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <ToggleGroup
                variant="outline"
                type="single"
                value={type}
                onValueChange={(val) => val && setType(val as TxType)}
                className="w-full"
            >
                <ToggleGroupItem value="expense" className="flex-1">
                    Expense
                </ToggleGroupItem>
                <ToggleGroupItem value="income" className="flex-1">
                    Income
                </ToggleGroupItem>
            </ToggleGroup>

            <div className="space-y-1.5">
                <Label>Amount</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp.
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={displayAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="pl-9"
                        required
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label>Account</Label>
                <Select value={accountId} onValueChange={setAccountId} disabled={loading}>
                    <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label>Category <span className="text-muted-foreground">*</span></Label>
                <Select required value={categoryId} onValueChange={setCategoryId} disabled={loading}>
                    <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={periodStart}
                    max={maxDate}
                    required
                    disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                    Must be within {periodStart} — {maxDate}
                </p>
            </div>

            <div className="space-y-1.5">
                <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                    type="text"
                    placeholder="Lunch, fuel, etc"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={loading}
                />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
        </form>
    )
}