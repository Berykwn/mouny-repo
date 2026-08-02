import { useEffect, useState, useCallback } from 'react'
import { Plus, PiggyBank } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { WishListItems } from './components/wish-list-items'
import { WishListForm } from './components/wish-list-form'
import { BuyItemForm } from './components/buy-item-form'
import { ContributeForm } from './components/contribute-form'
import { ContributeQuantityForm } from './components/contribute-quantity-form'
import { ProgressBar } from '@/components/progress-bar'
import { wishListService } from '@/services/wish-list.service'
import { payPeriodsService } from '@/services/pay-periods.service'
import { formatCurrency } from '@/lib/helpers'
import type { WishListItem } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'

export default function WishListPage() {
    const [items, setItems] = useState<WishListItem[]>([])
    const [periodId, setPeriodId] = useState<string | null>(null)
    const [periodStart, setPeriodStart] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [buyingItem, setBuyingItem] = useState<WishListItem | null>(null)
    const [contributingItem, setContributingItem] = useState<WishListItem | null>(null)
    const [editingItem, setEditingItem] = useState<WishListItem | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const { data: period } = await payPeriodsService.getActive()
        if (!period) {
            setPeriodId(null)
            setPeriodStart(null)
            setLoading(false)
            return
        }
        setPeriodId(period.id)
        setPeriodStart(period.start_date)

        const { data: itemsData } = await wishListService.getAll()
        setItems(itemsData ?? [])

        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleDeleteConfirm = async () => {
        if (!deletingId) return
        setDeleteLoading(true)
        const { error } = await wishListService.remove(deletingId)
        setDeleteLoading(false)
        if (error) { toast.error(error); return }
        setItems(prev => prev.filter(i => i.id !== deletingId))
        setDeletingId(null)
        toast.success('Item removed from wish list.')
    }

    const totalSaved = items.reduce((s, i) => s + i.saved_amount, 0)
    const totalTarget = items.reduce((s, i) => s + (i.estimated_price ?? 0), 0)
    const savedPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

    return (
        <section className="px-4 pb-4 space-y-4">
            {loading ? (
                <LoadingContent />
            ) : (
                <div className="space-y-5">
                    {/* Savings progress hero */}
                    <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Savings progress</p>
                            <Button
                                variant='outline'
                                size="sm"
                                onClick={() => setAddDrawerOpen(true)}
                                disabled={!periodId}
                            >
                                <Plus className="w-3.5 h-3.5" /> Wish
                            </Button>
                        </div>
                        <p className="text-[32px] font-medium tracking-[-0.02em] leading-none text-[#252525] tabular-nums">
                            {formatCurrency(totalSaved)}
                        </p>
                        {totalTarget > 0 ? (
                            <>
                                <ProgressBar percent={savedPercent} className="mt-3" />
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-[11px] text-[#8a8a84]">saved</p>
                                    <p className="text-[11px] text-[#8a8a84]">
                                        of {formatCurrency(totalTarget)} across {items.length} goal{items.length === 1 ? '' : 's'}
                                    </p>
                                </div>
                            </>
                        ) : items.length > 0 ? (
                            <p className="text-[11px] text-[#8a8a84] mt-2">
                                {items.length} goal{items.length === 1 ? '' : 's'} · set a target price to track progress
                            </p>
                        ) : null}
                    </div>

                    {periodId && (
                        items.length === 0 ? (
                            <button
                                type="button"
                                onClick={() => setAddDrawerOpen(true)}
                                className="w-full rounded-[20px] border border-[#e5e5e5] bg-white p-4 flex items-center gap-3 text-left hover:bg-[#fbfbfa] transition-colors"
                            >
                                <div className="w-9 h-9 rounded-[10px] bg-[#f4f4f2] flex items-center justify-center shrink-0">
                                    <PiggyBank className="w-4 h-4 text-[#8a8a84]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-[#252525]">No savings goals yet</p>
                                    <p className="text-[11.5px] text-[#8a8a84] mt-0.5">Tap to start saving toward something you want</p>
                                </div>
                            </button>
                        ) : (
                            <WishListItems
                                items={items}
                                onDeleteRequest={setDeletingId}
                                onBuy={setBuyingItem}
                                onContribute={setContributingItem}
                                onEdit={setEditingItem}
                            />
                        )
                    )}
                </div>
            )}

            {/* Add drawer */}
            {periodId && (
                <BottomDrawer
                    open={addDrawerOpen}
                    onClose={() => setAddDrawerOpen(false)}
                    title="Add to Wish List"
                >
                    <WishListForm
                        payPeriodId={periodId}
                        onSuccess={() => { setAddDrawerOpen(false); load() }}
                    />
                </BottomDrawer>
            )}

            {/* Edit drawer */}
            <BottomDrawer
                open={!!editingItem}
                onClose={() => setEditingItem(null)}
                title="Edit Wish Item"
            >
                {editingItem && periodId && (
                    <WishListForm
                        payPeriodId={periodId}
                        item={editingItem}
                        onSuccess={() => { setEditingItem(null); load() }}
                    />
                )}
            </BottomDrawer>

            {/* Contribute drawer */}
            <BottomDrawer
                open={!!contributingItem}
                onClose={() => setContributingItem(null)}
                title={contributingItem?.quantity ? 'Cicil' : 'Add Funds'}
            >
                {contributingItem && (
                    contributingItem.quantity && periodStart ? (
                        <ContributeQuantityForm
                            item={contributingItem}
                            periodStart={periodStart}
                            onSuccess={() => { setContributingItem(null); load() }}
                        />
                    ) : (
                        <ContributeForm
                            item={contributingItem}
                            onSuccess={() => { setContributingItem(null); load() }}
                        />
                    )
                )}
            </BottomDrawer>

            {/* Buy drawer */}
            <BottomDrawer
                open={!!buyingItem}
                onClose={() => setBuyingItem(null)}
                title="Record Purchase"
            >
                {buyingItem && periodStart && (
                    <BuyItemForm
                        item={buyingItem}
                        periodStart={periodStart}
                        onSuccess={() => { setBuyingItem(null); load() }}
                    />
                )}
            </BottomDrawer>

            {/* Delete confirm */}
            <ConfirmDrawer
                open={!!deletingId}
                title="Remove Item"
                description="Remove this item from your wish list? This action cannot be undone."
                confirmLabel="Remove"
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                onClose={() => setDeletingId(null)}
            />
        </section>
    )
}
