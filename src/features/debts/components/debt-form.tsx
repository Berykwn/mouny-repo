import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { accountsService } from '@/services/accounts-categories.service'
import type { Account } from '@/types'
import { cn } from '@/lib/utils'

interface DebtFormProps {
    onSuccess: () => void
}

type DebtType = 'debt' | 'receivable'

export function DebtForm({ onSuccess }: DebtFormProps) {
    const [type, setType] = useState<DebtType>('debt')
    const [counterparty, setCounterparty] = useState('')
    const [amount, setAmount] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [accountId, setAccountId] = useState('')
    const [notes, setNotes] = useState('')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        accountsService.getAll().then(({ data }) => {
            if (data) setAccounts(data)
        })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const parsed = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
        if (isNaN(parsed) || parsed <= 0) { setError('Nominal tidak valid.'); return }

        setLoading(true)
        const { error } = await debtsService.create({
            type,
            counterparty,
            total_amount: parsed,
            remaining_amount: parsed,
            due_date: dueDate || null,
            pay_from_account_id: accountId || null,
            status: 'active',
            notes: notes || null,
        })
        setLoading(false)
        if (error) { setError(error); return }
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            {/* Type toggle */}
            <div className="flex rounded-lg border overflow-hidden">
                {(['debt', 'receivable'] as DebtType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={cn(
                            'flex-1 py-2 text-sm font-medium transition-colors',
                            type === t
                                ? 'bg-foreground text-background'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {t === 'debt' ? 'Saya berhutang' : 'Saya dihutangi'}
                    </button>
                ))}
            </div>

            {/* Counterparty */}
            <div className="space-y-1.5">
                <Label>{type === 'debt' ? 'Nama pemberi hutang' : 'Nama peminjam'}</Label>
                <Input
                    placeholder="Nama orang / pihak"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    required
                    disabled={loading}
                />
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

            {/* Due date */}
            <div className="space-y-1.5">
                <Label>Jatuh tempo <span className="text-muted-foreground">(opsional)</span></Label>
                <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={loading}
                />
            </div>

            {/* Pay from account */}
            <div className="space-y-1.5">
                <Label>Rencana bayar dari <span className="text-muted-foreground">(opsional)</span></Label>
                <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    disabled={loading}
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                    <option value="">— Belum ditentukan —</option>
                    {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
                <Label>Catatan <span className="text-muted-foreground">(opsional)</span></Label>
                <Input
                    placeholder="Detail hutang"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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