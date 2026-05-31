import { useEffect, useState, useCallback } from 'react'
import { Plus, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { WishListItems } from './components/wish-list-items'
import { WishListForm } from './components/wish-list-form'
import { BuyItemForm } from './components/buy-item-form'
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
    const [analysis, setAnalysis] = useState<Record<string, any>>({})
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
        const list = itemsData ?? []
        setItems(list)

        const { data: analysisData } = await wishListService.analyze(list)
        setAnalysis(analysisData ?? {})

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

    const totalEstimated = items.reduce((s, i) => s + (i.estimated_price ?? 0), 0)
    const affordableCount = items.filter(i => analysis[i.id]?.canAfford).length

    return (
        <section className="px-4 pb-4 space-y-4">
            {loading ? (
                <LoadingContent />
            ) : (
                <div className="space-y-5">
                    {/* Summary card */}
                    <div className="rounded-2xl border border-neutral-200 bg-card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">
                                {items.length} item · {affordableCount} affordable now
                            </p>
                            <p className="text-xl font-bold mt-0.5">{formatCurrency(totalEstimated)}</p>
                        </div>
                        <Button
                            variant='outline'
                            onClick={() => setAddDrawerOpen(true)}
                            className="font-bold"
                            disabled={!periodId}
                        >
                            <Plus className="w-4 h-4" />
                            Wish
                        </Button>
                    </div>

                    {periodId && (
                        <WishListItems
                            items={items}
                            analysis={analysis}
                            onDeleteRequest={setDeletingId}
                            onBuy={setBuyingItem}
                        />
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