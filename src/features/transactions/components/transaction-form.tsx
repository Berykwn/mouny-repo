import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { transactionsService, type CreateTransactionInput } from '@/services/transactions.service'
import { accountsService, categoriesService } from '@/services/accounts-categories.service'
import { toISODate } from '@/lib/helpers'
import type { Account, Category } from '@/types'
import { cn } from '@/lib/utils'

interface TransactionFormProps {
    payPeriodId: string
    onSuccess: () => void
}

type TxType = 'income' | 'expense'

export function TransactionForm({ payPeriodId, onSuccess }: TransactionFormProps) {
    const [type, setType] = useState<TxType>('expense')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [date, setDate] = useState(toISODate())
    const [accountId, setAccountId] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        accountsService.getAll().then(({ data }) => {
            if (data) {
                setAccounts(data)
                if (data.length > 0) setAccountId(data[0].id)
            }
        })
    }, [])

    useEffect(() => {
        categoriesService.getByType(type).then(({ data }) => {
            if (data) {
                setCategories(data)
                setCategoryId(data[0]?.id ?? '')
            }
        })
    }, [type])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!accountId) { setError('Pilih akun terlebih dahulu.'); return }

        const parsed = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
        if (isNaN(parsed) || parsed <= 0) { setError('Nominal tidak valid.'); return }

        setLoading(true)
        const input: CreateTransactionInput = {
            pay_period_id: payPeriodId,
            account_id: accountId,
            category_id: categoryId || undefined,
            type,
            amount: parsed,
            note: note || undefined,
            date,
        }

        const { error } = await transactionsService.create(input)
        setLoading(false)

        if (error) { setError(error); return }
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            {/* Type toggle */}
            <div className="flex rounded-lg border overflow-hidden">
                {(['expense', 'income'] as TxType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={cn(
                            'flex-1 py-2 text-sm font-medium transition-colors',
                            type === t
                                ? t === 'expense'
                                    ? 'bg-destructive text-destructive-foreground'
                                    : 'bg-green-600 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                    </button>
                ))}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
                <Label>Nominal</Label>
                <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                    required
                    disabled={loading}
                />
            </div>

            {/* Account */}
            <div className="space-y-1.5">
                <Label>Akun</Label>
                <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    disabled={loading}
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                    {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
                <Label>Kategori</Label>
                <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={loading}
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                    <option value="">— Tanpa kategori —</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
                <Label>Catatan <span className="text-muted-foreground">(opsional)</span></Label>
                <Input
                    type="text"
                    placeholder="Makan siang, bensin, dll"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={loading}
                />
            </div>

            {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </Button>
        </form>
    )
}