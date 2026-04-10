import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { transactionsService } from '@/services/transactions.service'
import { formatCurrency, toISODate } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'

interface PayDebtFormProps {
    debt: DebtWithAccount
    payPeriodId: string
    onSuccess: () => void
}

export function PayDebtForm({ debt, payPeriodId, onSuccess }: PayDebtFormProps) {
    const [amount, setAmount] = useState(String(debt.remaining_amount))
    const [date, setDate] = useState(toISODate())
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const parsed = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
        if (isNaN(parsed) || parsed <= 0) { setError('Nominal tidak valid.'); return }
        if (parsed > debt.remaining_amount) { setError(`Maksimal ${formatCurrency(debt.remaining_amount)}`); return }

        if (!debt.pay_from_account_id) { setError('Akun pembayaran belum ditentukan di data hutang.'); return }

        setLoading(true)

        // 1. Buat transaksi pengeluaran
        const { error: txError } = await transactionsService.create({
            pay_period_id: payPeriodId,
            account_id: debt.pay_from_account_id,
            type: 'expense',
            amount: parsed,
            note: `Bayar hutang — ${debt.counterparty}`,
            date,
        })

        if (txError) { setError(txError); setLoading(false); return }

        // 2. Update remaining_amount hutang
        const { error: debtError } = await debtsService.recordPayment(debt.id, parsed)
        setLoading(false)

        if (debtError) { setError(debtError); return }
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="rounded-lg bg-muted px-4 py-3 space-y-0.5">
                <p className="text-xs text-muted-foreground">Sisa hutang ke {debt.counterparty}</p>
                <p className="text-lg font-semibold">{formatCurrency(debt.remaining_amount)}</p>
            </div>

            <div className="space-y-1.5">
                <Label>Nominal pembayaran</Label>
                <Input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                    required
                    disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                    Bayar dari: {debt.pay_from_account?.name ?? '—'}
                </p>
            </div>

            <div className="space-y-1.5">
                <Label>Tanggal bayar</Label>
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Catat Pembayaran'}
            </Button>
        </form>
    )
}