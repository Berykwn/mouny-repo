import { formatDate, formatShortCurrency } from '@/lib/helpers'
import type { WishListPurchased } from '@/services/wish-list.service'
import { PlanRow, PlanSection, RowAmount } from '@/features/plan/components/layout'
import { WishTile } from './wish-tile'

const MAX_SHOWN = 5

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))

/** What a bought wish cost: its parts together for a split wish, else its purchase. */
function paid(item: WishListPurchased): number {
    if (item.parts?.length) return item.parts.reduce((s, p) => s + (p.paid_amount ?? 0), 0)
    return item.purchase?.amount ?? item.saved_amount
}

/** When it was bought: the last part's date for a split wish. */
function boughtOn(item: WishListPurchased): string | null {
    if (item.parts?.length) {
        return item.parts.reduce<string | null>((d, p) => (p.purchased_on && (!d || p.purchased_on > d) ? p.purchased_on : d), null)
    }
    return item.purchase?.date ?? null
}

/** Wishes already bought — proof the list works, so it isn't only a list of what's missing. */
export function WishAchieved({ items }: { items: WishListPurchased[] }) {
    if (items.length === 0) return null

    const total = items.reduce((s, i) => s + paid(i), 0)

    return (
        <PlanSection title="Came true" meta={`${formatShortCurrency(total)} of things you wanted`}>
            {items.slice(0, MAX_SHOWN).map(item => {
                const date = boughtOn(item)
                return (
                    <PlanRow
                        key={item.id}
                        lead={<WishTile name={item.name} icon={item.icon} className="opacity-80" />}
                        title={item.name}
                        sub={[date && `Bought ${formatDate(date)}`, item.parts?.length && `${item.parts.length} parts`].filter(Boolean).join(' · ') || 'Bought'}
                        end={<RowAmount muted>{plain(paid(item))}</RowAmount>}
                    />
                )
            })}
        </PlanSection>
    )
}
