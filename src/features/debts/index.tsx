import { useEffect, useState, useCallback } from 'react'
import { Plus, HandCoins } from 'lucide-react'
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
        <section className="px-4 pb-4 space-y-4">
            {loading ? <LoadingContent /> : (
                <>
                    <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Net position</p>
                                <p className={cn(
                                    'text-[32px] font-medium tracking-[-0.02em] leading-none mt-1',
                                    net > 0 ? 'text-[#059669]' : net < 0 ? 'text-[#dc2626]' : 'text-[#252525]'
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
                                <Plus className="w-3.5 h-3.5" /> Debt
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#f2f2f0]">
                            <div>
                                <p className="text-[11px] text-[#8a8a84]">Debt</p>
                                <p className="text-[13px] font-medium text-[#dc2626]">{formatCurrency(totalOwed)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-[#8a8a84]">Receivable</p>
                                <p className="text-[13px] font-medium text-[#059669]">{formatCurrency(totalReceivable)}</p>
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
                                        'px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors',
                                        filter === f
                                            ? 'bg-[#f4f4f2] text-[#252525] border-[#e5e5e5]'
                                            : 'bg-white text-[#8a8a84] border-[#e5e5e5] hover:text-[#252525]'
                                    )}
                                >
                                    {filterLabels[f]}
                                </button>
                            ))}
                        </div>
                    )}

                    {debts.length === 0 ? (
                        <button
                            type="button"
                            onClick={() => setAddDrawerOpen(true)}
                            className="w-full rounded-[20px] border border-[#e5e5e5] bg-white p-4 flex items-center gap-3 text-left hover:bg-[#fbfbfa] transition-colors"
                        >
                            <div className="w-9 h-9 rounded-[10px] bg-[#f4f4f2] flex items-center justify-center shrink-0">
                                <HandCoins className="w-4 h-4 text-[#8a8a84]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-[#252525]">No debts yet</p>
                                <p className="text-[11.5px] text-[#8a8a84] mt-0.5">Tap to track money you owe or are owed</p>
                            </div>
                        </button>
                    ) : (
                        <DebtList
                            debts={filteredDebts}
                            onDelete={setDeletingDebt}
                            onPay={setPayingDebt}
                            onCollect={setCollectingDebt}
                        />
                    )}
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
        </section>
    )
}