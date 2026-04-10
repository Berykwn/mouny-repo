import { useEffect, useState, useCallback } from 'react'
import { Plus, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomDrawer } from '@/components/bottom-drawer'
import { WishListItems } from './components/wish-list-items'
import { WishListForm } from './components/wish-list-form'
import { BuyItemForm } from './components/buy-item-form'
import { wishListService } from '@/services/wish-list.service'
import { payPeriodsService } from '@/services/pay-periods.service'
import { formatCurrency } from '@/lib/helpers'
import type { WishListItem } from '@/types'

export default function WishListPage() {
    const [items, setItems] = useState<WishListItem[]>([])
    const [periodId, setPeriodId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [buyingItem, setBuyingItem] = useState<WishListItem | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const { data: period } = await payPeriodsService.getActive()
        if (!period) { setLoading(false); return }
        setPeriodId(period.id)
        const { data } = await wishListService.getByPeriod(period.id)
        setItems(data ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this item from wishlist?')) return
        await wishListService.remove(id)
        setItems((prev) => prev.filter((i) => i.id !== id))
    }

    const totalEstimated = items.reduce((s, i) => s + (i.estimated_price ?? 0), 0)

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold">Wish List</h1>
                    <p className="text-xs text-muted-foreground">Your planned purchases for this period</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddDrawerOpen(true)} disabled={!periodId}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                </Button>
            </div>

            {/* Summary */}
            {!loading && items.length > 0 && (
                <div className="rounded-2xl border bg-card p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {items.length} items · total estimate
                            </p>
                            <p className="text-lg font-semibold">
                                {formatCurrency(totalEstimated)}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">High priority</p>
                        <p className="text-sm font-medium">
                            {items.filter(i => i.priority === 'high').length} items
                        </p>
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
                    <p className="text-sm font-medium">No active period</p>
                    <p className="text-xs text-muted-foreground">
                        Create a new pay period from dashboard.
                    </p>
                </div>
            ) : (
                <WishListItems
                    items={items}
                    onDelete={handleDelete}
                    onBuy={setBuyingItem}
                />
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
                {buyingItem && (
                    <BuyItemForm
                        item={buyingItem}
                        onSuccess={() => { setBuyingItem(null); load() }}
                    />
                )}
            </BottomDrawer>
        </div>
    )
}