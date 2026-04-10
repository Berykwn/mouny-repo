import { useEffect, useState, useCallback } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomDrawer } from '@/components/bottom-drawer'
import { TransactionList } from './components/transaction-list'
import { TransactionForm } from './components/transaction-form'
import { transactionsService } from '@/services/transactions.service'
import { payPeriodsService } from '@/services/pay-periods.service'
import { formatCurrency } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
    const [periodId, setPeriodId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const { data: period } = await payPeriodsService.getActive()
        if (!period) { setLoading(false); return }

        setPeriodId(period.id)
        const { data: txs } = await transactionsService.getByPeriod(period.id)
        setTransactions(txs ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus transaksi ini?')) return
        await transactionsService.remove(id)
        setTransactions((prev) => prev.filter((t) => t.id !== id))
    }

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Transaksi</h1>
                    <p className="text-xs text-muted-foreground">Periode aktif</p>
                </div>
                <Button
                    size="sm"
                    onClick={() => setDrawerOpen(true)}
                    disabled={!periodId}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Tambah
                </Button>
            </div>

            {/* Summary chips */}
            {!loading && transactions.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-card p-3 space-y-0.5">
                        <p className="text-xs text-muted-foreground">Pemasukan</p>
                        <p className="text-base font-semibold text-green-600">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div className="rounded-xl border bg-card p-3 space-y-0.5">
                        <p className="text-xs text-muted-foreground">Pengeluaran</p>
                        <p className="text-base font-semibold">{formatCurrency(totalExpense)}</p>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            ) : !periodId ? (
                <div className="text-center py-16 space-y-1">
                    <p className="text-sm font-medium">Belum ada periode aktif</p>
                    <p className="text-xs text-muted-foreground">Buat periode gaji baru dari Dashboard.</p>
                </div>
            ) : (
                <TransactionList transactions={transactions} onDelete={handleDelete} />
            )}

            {/* Drawer */}
            {periodId && (
                <BottomDrawer
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    title="Tambah Transaksi"
                >
                    <TransactionForm
                        payPeriodId={periodId}
                        onSuccess={() => { setDrawerOpen(false); load() }}
                    />
                </BottomDrawer>
            )}
        </div>
    )
}