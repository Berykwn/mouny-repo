import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { DebtList } from './components/debt-list'
import { DebtForm } from './components/debt-form'
import { PayDebtForm } from './components/pay-debt-form'
import { PayReceivableForm } from './components/pay-receivable-form'
import { debtsService } from '@/services/debts.service'
import { payPeriodsService } from '@/services/pay-periods.service'
import { formatCurrency } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'

type FilterType = 'all' | 'debt' | 'receivable'

export default function DebtsPage() {
    const [debts, setDebts] = useState<DebtWithAccount[]>([])
    const [periodId, setPeriodId] = useState<string | null>(null)
    const [periodStartDate, setPeriodStartDate] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [payingDebt, setPayingDebt] = useState<DebtWithAccount | null>(null)
    const [collectingDebt, setCollectingDebt] = useState<DebtWithAccount | null>(null)
    const [filter, setFilter] = useState<FilterType>('all')
    const [deletingDebt, setDeletingDebt] = useState<DebtWithAccount | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const [{ data: period }, { data: debtData }] = await Promise.all([
            payPeriodsService.getActive(),
            debtsService.getActive(),
        ])
        setPeriodId(period?.id ?? null)
        setPeriodStartDate(period?.start_date ?? null)
        setDebts(debtData ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleDeleteConfirm = async () => {
        if (!deletingDebt) return
        setDeleteLoading(true)
        const { error } = await debtsService.remove(deletingDebt.id)
        setDeleteLoading(false)
        if (error) { toast.error(error); return }
        setDebts((prev) => prev.filter((d) => d.id !== deletingDebt.id))
        setDeletingDebt(null)
        toast.success('Debt record deleted.')
    }

    const deleteDescription = (() => {
        if (!deletingDebt) return ''
        const paidAmount = deletingDebt.total_amount - deletingDebt.remaining_amount
        const isFullyPaid = deletingDebt.remaining_amount === 0
        const isUnpaid = paidAmount === 0
        if (isFullyPaid) return 'This debt is fully paid. Deleting will remove the record only — past transactions are unaffected.'
        if (isUnpaid) return 'This debt has no payments recorded yet. The record will be permanently removed.'
        return `${formatCurrency(paidAmount)} of this debt has already been recorded as paid. Deleting will remove the debt record, but those transactions will remain in your history.`
    })()

    const myDebts = debts.filter(d => d.type === 'debt')
    const receivables = debts.filter(d => d.type === 'receivable')
    const totalOwed = myDebts.reduce((s, d) => s + d.remaining_amount, 0)
    const totalReceivable = receivables.reduce((s, d) => s + d.remaining_amount, 0)
    const net = totalReceivable - totalOwed

    const filterCounts: Record<FilterType, number> = {
        all: debts.length,
        debt: myDebts.length,
        receivable: receivables.length,
    }
    const filteredDebts = filter === 'all' ? debts : debts.filter(d => d.type === filter)
    const filterLabels: Record<FilterType, string> = {
        all: `All (${filterCounts.all})`,
        debt: `Debt (${filterCounts.debt})`,
        receivable: `Receivable (${filterCounts.receivable})`,
    }

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
            {loading ? <LoadingContent /> : (
                <>
                    <div className="rounded-2xl border border-neutral-200 bg-card p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-muted-foreground">Net position</p>
                                <p className={cn(
                                    'text-2xl font-semibold mt-0.5',
                                    net > 0 ? 'text-green-600' : net < 0 ? 'text-destructive' : 'text-foreground'
                                )}>
                                    {net >= 0 ? '+' : ''}{formatCurrency(net)}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAddDrawerOpen(true)}
                                disabled={!periodId}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Debt
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                            <div>
                                <p className="text-[11px] text-muted-foreground">Debt</p>
                                <p className="text-sm font-medium text-destructive">{formatCurrency(totalOwed)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground">Receivable</p>
                                <p className="text-sm font-medium text-green-600">{formatCurrency(totalReceivable)}</p>
                            </div>
                        </div>
                    </div>

                    {debts.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {(Object.keys(filterLabels) as FilterType[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                                        filter === f
                                            ? 'bg-neutral-200 text-neutral-600 border-neutral-200'
                                            : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40'
                                    )}
                                >
                                    {filterLabels[f]}
                                </button>
                            ))}
                        </div>
                    )}

                    <DebtList
                        debts={filteredDebts}
                        onDelete={setDeletingDebt}
                        onPay={setPayingDebt}
                        onCollect={setCollectingDebt}
                    />
                </>
            )}

            <BottomDrawer
                open={addDrawerOpen}
                onClose={() => setAddDrawerOpen(false)}
                title="Add Debt"
            >
                {periodId && periodStartDate && (
                    <DebtForm
                        payPeriodId={periodId}
                        periodStartDate={periodStartDate}
                        onSuccess={() => { setAddDrawerOpen(false); load() }}
                    />
                )}
            </BottomDrawer>

            <BottomDrawer
                open={!!payingDebt}
                onClose={() => setPayingDebt(null)}
                title="Record Payment"
            >
                {payingDebt && periodId && periodStartDate && (
                    <PayDebtForm
                        debt={payingDebt}
                        payPeriodId={periodId}
                        periodStartDate={periodStartDate}
                        onSuccess={() => { setPayingDebt(null); load() }}
                    />
                )}
            </BottomDrawer>

            <BottomDrawer
                open={!!collectingDebt}
                onClose={() => setCollectingDebt(null)}
                title="Record Collection"
            >
                {collectingDebt && periodId && periodStartDate && (
                    <PayReceivableForm
                        debt={collectingDebt}
                        payPeriodId={periodId}
                        periodStartDate={periodStartDate}
                        onSuccess={() => { setCollectingDebt(null); load() }}
                    />
                )}
            </BottomDrawer>

            <ConfirmDrawer
                open={!!deletingDebt}
                title="Delete Debt"
                description={deleteDescription}
                confirmLabel="Delete"
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                onClose={() => setDeletingDebt(null)}
            />
        </div>
    )
}