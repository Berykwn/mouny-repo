import TrophyIcon from '~icons/ph/trophy-duotone'
import { formatCurrency, formatDate, formatShortCurrency } from '@/lib/helpers'
import type { WishListPurchased } from '@/services/wish-list.service'
import { WishTile } from './wish-tile'

const MAX_SHOWN = 5

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
    const shown = items.slice(0, MAX_SHOWN)

    return (
        <div className="card overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#f59e0b]/15 text-warning-ink flex items-center justify-center shrink-0">
                    <TrophyIcon className="w-[22px] h-[22px]" />
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">
                        {items.length} wish{items.length === 1 ? '' : 'es'} came true
                    </p>
                    <p className="text-[11px] text-muted-ink tabular-nums">{formatCurrency(total)} of things you wanted, now yours</p>
                </div>
            </div>

            <ul className="border-t border-line-soft divide-y divide-line-soft">
                {shown.map(item => {
                    const date = boughtOn(item)
                    return (
                        <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                            <WishTile name={item.name} icon={item.icon} className="w-8 h-8 rounded-[10px] opacity-80" iconClassName="w-[18px] h-[18px]" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] text-ink truncate">{item.name}</p>
                                {!!item.parts?.length && (
                                    <p className="text-[10.5px] text-subtle-ink">{item.parts.length} parts</p>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[12px] font-medium text-ink tabular-nums">
                                    {formatShortCurrency(paid(item))}
                                </p>
                                {date && (
                                    <p className="text-[10.5px] text-subtle-ink">{formatDate(date)}</p>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
