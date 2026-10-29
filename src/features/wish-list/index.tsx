import { useState, useMemo } from 'react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { WishListForm } from './components/wish-list-form'
import { BuyItemForm } from './components/buy-item-form'
import { ContributeForm } from './components/contribute-form'
import { ContributeQuantityForm } from './components/contribute-quantity-form'
import { WishRow } from './components/wish-card'
import { AffordSheet } from './components/afford-sheet'
import { WishAchieved } from './components/wish-achieved'
import { WishEmpty } from './components/wish-empty'
import { WishDetail } from './components/wish-detail'
import { WishPartsForm } from './components/wish-parts-form'
import { buildRoadmap, sortWishes, wishProgress } from './lib/wish-analytics'
import { payoffPlan } from '@/features/debts/lib/debt-insights'
import { wishListService, type WishListPurchased } from '@/services/wish-list.service'
import { useDebts, usePeriods, usePeriodTransactions, usePurchasedWishes, useSavingsPace, useWishes } from '@/queries'
import { formatCurrency, formatShortCurrency, toISODate } from '@/lib/helpers'
import type { DebtWithAccount, WishListItem, WishPart } from '@/types'
import { toast } from 'sonner'
import { LoadingContent } from '@/components/loading-content'
import { Kpis, OutlineButton, PlanHeader, PlanSection } from '@/features/plan/components/layout'

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))

const NO_WISHES: WishListItem[] = []
const NO_PURCHASED: WishListPurchased[] = []
const NO_DEBTS: DebtWithAccount[] = []

export default function WishListPage() {
    const { activePeriod, isPending: periodsPending } = usePeriods()
    const periodId = activePeriod?.id ?? null
    const periodStart = activePeriod?.start_date ?? null
    const wishesQuery = useWishes()
    // Wishes are saved toward within a period; without an open one there's nothing to show.
    const items = (activePeriod && wishesQuery.data) || NO_WISHES
    const loading = periodsPending || (!!activePeriod && wishesQuery.isPending)
    // The achievements and the pace are extras: if they fail, the list still works.
    const { data: purchased = NO_PURCHASED } = usePurchasedWishes()
    const pace = useSavingsPace()
    const { data: debts = NO_DEBTS } = useDebts({ activeOnly: true })
    const { data: periodTxs } = usePeriodTransactions(periodId)
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [addDefaultName, setAddDefaultName] = useState<string | undefined>(undefined)
    const [addDefaultPrice, setAddDefaultPrice] = useState<number | undefined>(undefined)
    const [affordOpen, setAffordOpen] = useState(false)
    const [openItem, setOpenItem] = useState<WishListItem | null>(null)
    const [buyingItem, setBuyingItem] = useState<WishListItem | null>(null)
    const [contributingItem, setContributingItem] = useState<WishListItem | null>(null)
    const [editingItem, setEditingItem] = useState<WishListItem | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [partsItem, setPartsItem] = useState<WishListItem | null>(null)
    const [buyingPart, setBuyingPart] = useState<{ item: WishListItem; part: WishPart } | null>(null)
    const [undoingPart, setUndoingPart] = useState<WishPart | null>(null)
    const [undoLoading, setUndoLoading] = useState(false)

    const handleUndoConfirm = async () => {
        if (!undoingPart) return
        setUndoLoading(true)
        const { error } = await wishListService.undoPart(undoingPart)
        setUndoLoading(false)
        if (error) { toast.error(error); return }
        toast.success(`${undoingPart.name} is back on the list.`)
        setUndoingPart(null)
    }

    const handleDeleteConfirm = async () => {
        if (!deletingId) return
        setDeleteLoading(true)
        const { error } = await wishListService.remove(deletingId)
        setDeleteLoading(false)
        if (error) { toast.error(error); return }
        setDeletingId(null)
        toast.success('Item removed from wish list.')
    }

    const openAdd = (name?: string, price?: number) => {
        setAddDefaultName(name)
        setAddDefaultPrice(price)
        setAddDrawerOpen(true)
    }

    // The usual leftover pays debts first, so wish months start after the debt-free date.
    const owedFirst = useMemo(() => payoffPlan(debts, pace).owed, [debts, pace])
    const roadmap = useMemo(() => buildRoadmap(items, pace, undefined, owedFirst), [items, pace, owedFirst])
    // Installments of a quantity wish are dated transactions; plain "Add funds" keeps no date.
    const savedThisPeriod = (item: WishListItem) => item.quantity && periodTxs
        ? periodTxs.filter(t => t.wish_list_item_id === item.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        : null

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

    const today = toISODate()
    const sorted = useMemo(() => sortWishes(items), [items])
    const stopById = useMemo(() => new Map(roadmap.map(s => [s.item.id, s])), [roadmap])
    const affordButton = <OutlineButton onClick={() => setAffordOpen(true)}>Can I afford it?</OutlineButton>
    // Saved in full first, like Bills' due before paid; each keeps the urgent-first order.
    const ready = useMemo(() => sorted.filter(item => wishProgress(item).ready), [sorted])
    const saving = useMemo(() => sorted.filter(item => !wishProgress(item).ready), [sorted])
    const row = (item: WishListItem) => (
        <WishRow
            key={item.id}
            item={item}
            stop={stopById.get(item.id)}
            pace={pace}
            today={today}
            onOpen={() => setOpenItem(item)}
            onBuy={() => setBuyingItem(item)}
            owedFirst={owedFirst}
        />
    )

    // How the months are worked out, said once, plainly.
    const etaNote = pace && pace.perDay > 0
        ? `Months are estimates: your usual leftover, averaged over your last ${pace.basedOn} closed period${pace.basedOn === 1 ? '' : 's'}, goes to wishes one at a time, urgent first${owedFirst > 0 ? ', after your debts are paid off' : ''}.`
        : pace
            ? 'Recent periods spent everything that came in, so there are no month estimates yet.'
            : 'Month estimates start once you’ve closed a period: they come from what you usually have left over.'

    return (
        <>
            <PlanHeader title="Wishlist" add={{ label: 'Add wish', onClick: () => openAdd(), disabled: !periodId }} extra={affordButton} />
            <section className="px-4 pb-4 lg:px-0 space-y-6 lg:max-w-3xl">
                {loading ? (
                    <LoadingContent />
                ) : periodId ? (
                    <>
                        <Kpis className="lg:hidden" items={[
                            { label: 'Saved toward wishes', value: formatShortCurrency(totals.saved) },
                            { label: 'Usual leftover', value: pace ? `~${formatShortCurrency(Math.max(0, Math.round(pace.perPeriod)))}` : '—', sub: 'per period' },
                        ]} />
                        <Kpis className="hidden lg:grid" items={[
                            { label: 'Wishes', value: items.length },
                            { label: 'Saved toward wishes', value: plain(totals.saved) },
                            { label: 'Usual leftover', value: pace ? `~${plain(Math.max(0, pace.perPeriod))}` : '—', sub: 'per period' },
                        ]} />

                        {items.length === 0 ? (
                            <WishEmpty onAdd={openAdd} />
                        ) : (
                            <>
                                {ready.length > 0 && (
                                    <PlanSection title="Ready to buy" meta={ready.length}>{ready.map(row)}</PlanSection>
                                )}
                                {saving.length > 0 && (
                                    <PlanSection
                                        title="Saving up"
                                        // On the phone the top bar has no room for it, so it sits by the list.
                                        action={(
                                            <button type="button" onClick={() => setAffordOpen(true)} className="lg:hidden text-[13px] font-medium text-brand-ink">
                                                Can I afford it?
                                            </button>
                                        )}
                                    >
                                        {saving.map(row)}
                                    </PlanSection>
                                )}
                                <p className="-mt-3 px-1 text-[11.5px] text-subtle-ink leading-relaxed">{etaNote}</p>
                            </>
                        )}
                        <WishAchieved items={purchased} />
                    </>
                ) : (
                    <p className="text-[13px] text-muted-ink px-1">Open a pay period to start adding wishes.</p>
                )}

                <BottomDrawer open={affordOpen} onClose={() => setAffordOpen(false)} title="Can I afford it?">
                    {affordOpen && (
                        <AffordSheet
                            onClose={() => setAffordOpen(false)}
                            onAddToWishlist={(name, price) => { setAffordOpen(false); openAdd(name || undefined, price) }}
                        />
                    )}
                </BottomDrawer>

                {/* Add drawer */}
                {periodId && (
                    <BottomDrawer
                        open={addDrawerOpen}
                        onClose={() => setAddDrawerOpen(false)}
                        title="Add wish"
                    >
                        {/* Keyed so each open starts fresh with the chosen suggestion. */}
                        {addDrawerOpen && (
                            <WishListForm
                                key={`${addDefaultName ?? ''}-${addDefaultPrice ?? ''}`}
                                payPeriodId={periodId}
                                defaultName={addDefaultName}
                                defaultPrice={addDefaultPrice}
                                onSuccess={() => setAddDrawerOpen(false)}
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
                            owedFirst={owedFirst}
                            savedThisPeriod={savedThisPeriod(openItem)}
                            onContribute={() => { setContributingItem(openItem); setOpenItem(null) }}
                            onBuy={() => { setBuyingItem(openItem); setOpenItem(null) }}
                            onEdit={() => { setEditingItem(openItem); setOpenItem(null) }}
                            onDelete={() => { setDeletingId(openItem.id); setOpenItem(null) }}
                            onEditParts={() => { setPartsItem(openItem); setOpenItem(null) }}
                            onBuyPart={(part) => { setBuyingPart({ item: openItem, part }); setOpenItem(null) }}
                            onUndoPart={(part) => { setUndoingPart(part); setOpenItem(null) }}
                        />
                    )}
                </BottomDrawer>

                {/* Parts drawer */}
                <BottomDrawer
                    open={!!partsItem}
                    onClose={() => setPartsItem(null)}
                    title={partsItem?.parts?.length ? 'Edit parts' : 'Split into parts'}
                >
                    {partsItem && (
                        <WishPartsForm item={partsItem} onSuccess={() => setPartsItem(null)} />
                    )}
                </BottomDrawer>

                {/* Buy part drawer */}
                <BottomDrawer
                    open={!!buyingPart}
                    onClose={() => setBuyingPart(null)}
                    title="Buy part"
                >
                    {buyingPart && periodStart && (
                        <BuyItemForm
                            item={buyingPart.item}
                            part={buyingPart.part}
                            periodStart={periodStart}
                            onSuccess={() => setBuyingPart(null)}
                        />
                    )}
                </BottomDrawer>

                {/* Undo part confirm */}
                <ConfirmDrawer
                    open={!!undoingPart}
                    title="Undo purchase"
                    description={undoingPart?.transaction_id
                        ? `Mark ${undoingPart.name} as not bought? Its expense of ${formatCurrency(undoingPart.paid_amount ?? 0)} is deleted and the money goes back to the account.`
                        : `Mark ${undoingPart?.name ?? 'this part'} as not bought?`}
                    confirmLabel="Undo"
                    loading={undoLoading}
                    onConfirm={handleUndoConfirm}
                    onClose={() => setUndoingPart(null)}
                />

                {/* Edit drawer */}
                <BottomDrawer
                    open={!!editingItem}
                    onClose={() => setEditingItem(null)}
                    title="Edit wish"
                >
                    {editingItem && periodId && (
                        <WishListForm
                            payPeriodId={periodId}
                            item={editingItem}
                            onSuccess={() => setEditingItem(null)}
                        />
                    )}
                </BottomDrawer>

                {/* Contribute drawer */}
                <BottomDrawer
                    open={!!contributingItem}
                    onClose={() => setContributingItem(null)}
                    title={contributingItem?.quantity ? 'Add a payment' : 'Add funds'}
                >
                    {contributingItem && (
                        contributingItem.quantity && periodStart ? (
                            <ContributeQuantityForm
                                item={contributingItem}
                                periodStart={periodStart}
                                onSuccess={() => setContributingItem(null)}
                            />
                        ) : (
                            <ContributeForm
                                item={contributingItem}
                                onSuccess={() => setContributingItem(null)}
                            />
                        )
                    )}
                </BottomDrawer>

                {/* Buy drawer */}
                <BottomDrawer
                    open={!!buyingItem}
                    onClose={() => setBuyingItem(null)}
                    title="Record purchase"
                >
                    {buyingItem && periodStart && (
                        <BuyItemForm
                            item={buyingItem}
                            periodStart={periodStart}
                            onSuccess={() => setBuyingItem(null)}
                        />
                    )}
                </BottomDrawer>

                {/* Delete confirm */}
                <ConfirmDrawer
                    open={!!deletingId}
                    title="Remove wish"
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
