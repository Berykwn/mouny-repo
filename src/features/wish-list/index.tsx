import { useEffect, useState, useCallback } from 'react'
import { Drum, Plus } from 'lucide-react'
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
import NoPeriod from '@/components/no-period'

export default function WishListPage() {
    const [items, setItems] = useState<WishListItem[]>([])
    const [periodId, setPeriodId] = useState<string | null>(null)
    const [periodStart, setPeriodStart] = useState<string | null>(null)  // for BuyItemForm validation
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

        setItems((prev) => prev.filter((i) => i.id !== deletingId))
        setDeletingId(null)
        toast.success('Item removed from wish list.')
    }

    const totalEstimated = items
        .filter(i => !i.is_purchased)
        .reduce((s, i) => s + (i.estimated_price ?? 0), 0)

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
            <div className="border-b pb-4 mb-4">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <p className="text-sm font-medium">Wish List</p>
                        <p className="text-xs text-muted-foreground">Planned purchases (all periods)</p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddDrawerOpen(true)}
                        disabled={!periodId}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                    </Button>
                </div>
            </div>

            {!loading && items.length > 0 && (
                <div className="rounded-2xl border bg-card p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-lime-100 dark:bg-lime-900 flex items-center justify-center">
                            <Drum className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {items.filter(i => !i.is_purchased).length} pending items · total estimate
                            </p>
                            <p className="text-lg font-semibold">{formatCurrency(totalEstimated)}</p>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <LoadingContent />
            ) : !periodId ? (
                <NoPeriod />
            ) : (
                <WishListItems
                    items={items}
                    analysis={analysis}
                    onDeleteRequest={setDeletingId}
                    onBuy={setBuyingItem}
                />
            )}

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

            <ConfirmDrawer
                open={!!deletingId}
                title="Remove Item"
                description="Remove this item from your wish list? This cannot be undone."
                confirmLabel="Remove"
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                onClose={() => setDeletingId(null)}
            />
        </div>
    )
}