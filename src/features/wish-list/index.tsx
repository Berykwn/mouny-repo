import { useEffect, useState, useCallback, useMemo } from 'react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { WishListItems } from './components/wish-list-items'
import { WishListForm } from './components/wish-list-form'
import { BuyItemForm } from './components/buy-item-form'
import { ContributeForm } from './components/contribute-form'
import { ContributeQuantityForm } from './components/contribute-quantity-form'
import { WishHero } from './components/wish-hero'
import { WishRoadmap } from './components/wish-roadmap'
import { WishAchieved } from './components/wish-achieved'
import { WishEmpty } from './components/wish-empty'
import { WishDetail } from './components/wish-detail'
import { buildRoadmap, pacePeriods, savingsPace, wishProgress, type SavingsPace } from './lib/wish-analytics'
import { wishListService, type WishListPurchased } from '@/services/wish-list.service'
import { payPeriodsService } from '@/services/pay-periods.service'
import { transactionsService } from '@/services/transactions.service'
import type { WishListItem } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { PageHeader } from '@/components/page-header'

export default function WishListPage() {
    const [items, setItems] = useState<WishListItem[]>([])
    const [periodId, setPeriodId] = useState<string | null>(null)
    const [periodStart, setPeriodStart] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [purchased, setPurchased] = useState<WishListPurchased[]>([])
    const [pace, setPace] = useState<SavingsPace | null>(null)
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [addDefaultName, setAddDefaultName] = useState<string | undefined>(undefined)
    const [openItem, setOpenItem] = useState<WishListItem | null>(null)
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

        const [
            { data: itemsData, error: itemsError },
            { data: purchasedData },
            { data: periods },
        ] = await Promise.all([
            wishListService.getAll(),
            wishListService.getPurchased(),
            payPeriodsService.getAll(),
        ])
        if (itemsError) toast.error(itemsError)
        setItems(itemsData ?? [])
        // The achievements and the pace are extras: if they fail, the list still works.
        setPurchased(purchasedData ?? [])

        const recent = pacePeriods(periods ?? [])
        if (recent.length > 0) {
            const { data: summaries } = await transactionsService.getPeriodSummaries(recent.map(p => p.id))
            setPace(summaries ? savingsPace(recent, summaries) : null)
        } else {
            setPace(null)
        }

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

    const openAdd = (name?: string) => {
        setAddDefaultName(name)
        setAddDrawerOpen(true)
    }

    const roadmap = useMemo(() => buildRoadmap(items, pace), [items, pace])

    // Totals only over wishes with a price, so the percentage compares like with like.
    const totals = useMemo(() => {
        let saved = 0, target = 0, remaining = 0, ready = 0
        for (const item of items) {
            const p = wishProgress(item)
            if (p.target === null) continue
            saved += Math.min(p.saved, p.target)
            target += p.target
            remaining += p.remaining ?? 0
            if (p.ready) ready++
        }
        return { saved, target, remaining, ready }
    }, [items])

    const hero = (
        <WishHero
            saved={totals.saved}
            target={totals.target}
            remaining={totals.remaining}
            goalCount={items.length}
            readyCount={totals.ready}
            pace={pace}
            roadmap={roadmap}
            canAdd={!!periodId}
            onAdd={() => openAdd()}
        />
    )

    return (
        <>
            <PageHeader title="Wishlist" />
            <section className="px-4 pb-4 lg:px-0 space-y-4">
                {loading ? (
                    <LoadingContent />
                ) : periodId ? (
                    <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start">
                        <div className="space-y-4 lg:order-2">
                            {hero}
                            {items.length > 0 && <WishRoadmap roadmap={roadmap} pace={pace} />}
                            <div className="hidden lg:block"><WishAchieved items={purchased} /></div>
                        </div>

                        <div className="space-y-4 lg:order-1">
                            {items.length === 0 ? (
                                <WishEmpty onAdd={openAdd} />
                            ) : (
                                <WishListItems
                                    items={items}
                                    roadmap={roadmap}
                                    pace={pace}
                                    onOpen={setOpenItem}
                                />
                            )}
                            <div className="lg:hidden"><WishAchieved items={purchased} /></div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 lg:max-w-[360px]">
                        {hero}
                        <p className="text-[11.5px] text-muted-ink px-1">Open a pay period to start adding wishes.</p>
                    </div>
                )}

                {/* Add drawer */}
                {periodId && (
                    <BottomDrawer
                        open={addDrawerOpen}
                        onClose={() => setAddDrawerOpen(false)}
                        title="Add to Wish List"
                    >
                        {/* Keyed so each open starts fresh with the chosen suggestion. */}
                        {addDrawerOpen && (
                            <WishListForm
                                key={addDefaultName ?? ''}
                                payPeriodId={periodId}
                                defaultName={addDefaultName}
                                onSuccess={() => { setAddDrawerOpen(false); load() }}
                            />
                        )}
                    </BottomDrawer>
                )}

                {/* Detail sheet — each action closes it and hands off to its own drawer */}
                <BottomDrawer
                    open={!!openItem}
                    onClose={() => setOpenItem(null)}
                    title={openItem?.name ?? ''}
                >
                    {openItem && (
                        <WishDetail
                            item={openItem}
                            stop={roadmap.find(s => s.item.id === openItem.id)}
                            pace={pace}
                            onContribute={() => { setContributingItem(openItem); setOpenItem(null) }}
                            onBuy={() => { setBuyingItem(openItem); setOpenItem(null) }}
                            onEdit={() => { setEditingItem(openItem); setOpenItem(null) }}
                            onDelete={() => { setDeletingId(openItem.id); setOpenItem(null) }}
                        />
                    )}
                </BottomDrawer>

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
        </>
    )
}
