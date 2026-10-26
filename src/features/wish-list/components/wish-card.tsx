import { formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { WishListItem } from '@/types'
import { etaMonth, nextPart, partsBreakdown, wishProgress, type RoadmapStop, type SavingsPace } from '../lib/wish-analytics'
import { WishTile } from './wish-tile'

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))
const units = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(n)

/** One segment per part, filled once it's bought. */
export function PartDots({ item, className }: { item: WishListItem; className?: string }) {
    const parts = item.parts ?? []
    return (
        <div className={cn('flex gap-1', className)} aria-label={`${parts.filter(p => p.is_purchased).length} of ${parts.length} parts bought`}>
            {parts.map(p => (
                <span key={p.id} className={cn('flex-1 h-1.5 rounded-full', p.is_purchased ? 'bg-info' : 'bg-line-soft')} />
            ))}
        </div>
    )
}

interface WishCardProps {
    item: WishListItem
    stop: RoadmapStop | undefined
    pace: SavingsPace | null
    today: string
    onOpen: () => void
    /** Offered when a plain wish is saved in full. */
    onBuy: () => void
}

/** A wish at a glance: how far along, and the month it's expected, from the usual leftover. */
export function WishCard({ item, stop, pace, today, onOpen, onBuy }: WishCardProps) {
    const { target, saved, remaining, percent, ready } = wishProgress(item)
    const parts = partsBreakdown(item)
    const isUOM = !!item.quantity
    const unit = item.unit ?? ''
    const eta = !ready && stop?.date && stop.periods ? etaMonth(stop.date, today) : null

    let sub: string
    if (parts) {
        const next = nextPart(item, pace, today)
        sub = `${parts.bought} of ${parts.total} parts`
        if (ready) sub += ' · ready to buy the rest'
        else if (next) sub += ` · next: ${next.part.name}${next.date ? ` around ${etaMonth(next.date, today)}` : ''}`
    } else if (isUOM) {
        sub = ready ? 'Target reached' : `Bought ${units(item.saved_quantity ?? 0)} ${unit}${eta ? ` · about ${eta}` : ''}`
    } else if (ready) {
        sub = 'Saved in full · ready to buy'
    } else if (remaining !== null) {
        sub = `${formatShortCurrency(remaining)} to go${eta ? ` · about ${eta}` : ''}`
    } else {
        sub = 'No price yet'
    }

    const amount = isUOM && !parts
        ? { main: `${units(item.saved_quantity ?? 0)} ${unit}`, of: `of ${units(item.quantity ?? 0)} ${unit}` }
        : ready && !parts && target !== null
            ? { main: plain(target), of: null }
            : { main: formatShortCurrency(saved), of: target !== null ? `of ${formatShortCurrency(target)}` : null }

    return (
        <div className="card p-4">
            <button type="button" onClick={onOpen} className="w-full text-left">
                <div className="flex items-center gap-3">
                    <WishTile name={item.name} icon={item.icon} />
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-ink truncate">{item.name}</p>
                        <p className={cn('text-[12px] truncate', ready ? 'text-brand-ink' : 'text-muted-ink')}>{sub}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[15px] font-semibold tabular-nums text-ink">{amount.main}</p>
                        {amount.of && <p className="text-[11.5px] text-subtle-ink tabular-nums">{amount.of}</p>}
                    </div>
                </div>
                {parts ? (
                    <PartDots item={item} className="mt-3.5" />
                ) : (target !== null || isUOM) && !(ready && !isUOM) ? (
                    <div className="mt-3.5 h-1.5 rounded-full bg-line-soft overflow-hidden">
                        <div className="h-full rounded-full bg-info transition-all" style={{ width: `${percent}%` }} />
                    </div>
                ) : null}
            </button>
            {ready && !parts && !isUOM && (
                <button
                    type="button"
                    onClick={onBuy}
                    className="mt-3 w-full h-12 rounded-[14px] text-[14px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors"
                >
                    Record purchase
                </button>
            )}
        </div>
    )
}
