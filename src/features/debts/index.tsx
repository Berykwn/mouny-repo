import { useEffect, useState, useCallback } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomDrawer } from '@/components/bottom-drawer'
import { DebtList } from './components/debt-list'
import { DebtForm } from './components/debt-form'
import { PayDebtForm } from './components/pay-debt-form'
import { debtsService } from '@/services/debts.service'
import { payPeriodsService } from '@/services/pay-periods.service'
import { formatCurrency } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'

export default function DebtsPage() {
    const [debts, setDebts] = useState<DebtWithAccount[]>([])
    const [periodId, setPeriodId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [payingDebt, setPayingDebt] = useState<DebtWithAccount | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const [{ data: period }, { data: debtData }] = await Promise.all([
            payPeriodsService.getActive(),
            debtsService.getActive(),
        ])
        setPeriodId(period?.id ?? null)
        setDebts(debtData ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus catatan hutang ini?')) return
        await debtsService.remove(id)
        setDebts((prev) => prev.filter((d) => d.id !== id))
    }

    const myDebts = debts.filter(d => d.type === 'debt')
    const receivables = debts.filter(d => d.type === 'receivable')
    const totalOwed = myDebts.reduce((s, d) => s + d.remaining_amount, 0)
    const totalReceivable = receivables.reduce((s, d) => s + d.remaining_amount, 0)

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Hutang</h1>
                    <p className="text-xs text-muted-foreground">Hutang & piutang aktif</p>
                </div>
                <Button size="sm" onClick={() => setAddDrawerOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Tambah
                </Button>
            </div>

            {/* Summary */}
            {!loading && debts.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-card p-3 space-y-0.5">
                        <p className="text-xs text-muted-foreground">Kamu berhutang</p>
                        <p className="text-base font-semibold text-destructive">{formatCurrency(totalOwed)}</p>
                    </div>
                    <div className="rounded-xl border bg-card p-3 space-y-0.5">
                        <p className="text-xs text-muted-foreground">Kamu dihutangi</p>
                        <p className="text-base font-semibold text-blue-600">{formatCurrency(totalReceivable)}</p>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <DebtList
                    debts={debts}
                    onDelete={handleDelete}
                    onPay={setPayingDebt}
                />
            )}

            {/* Add drawer */}
            <BottomDrawer
                open={addDrawerOpen}
                onClose={() => setAddDrawerOpen(false)}
                title="Tambah Hutang"
            >
                <DebtForm onSuccess={() => { setAddDrawerOpen(false); load() }} />
            </BottomDrawer>

            {/* Pay drawer */}
            <BottomDrawer
                open={!!payingDebt}
                onClose={() => setPayingDebt(null)}
                title="Catat Pembayaran"
            >
                {payingDebt && periodId && (
                    <PayDebtForm
                        debt={payingDebt}
                        payPeriodId={periodId}
                        onSuccess={() => { setPayingDebt(null); load() }}
                    />
                )}
            </BottomDrawer>
        </div>
    )
}