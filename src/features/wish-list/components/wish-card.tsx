import { formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { WishListItem } from '@/types'
import { etaPhrase, nextPart, partsBreakdown, wishProgress, type RoadmapStop, type SavingsPace } from '../lib/wish-analytics'
import { PillButton, PlanRow, RowAmount } from '@/features/plan/components/layout'
import { WishTile } from './wish-tile'

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))
const units = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(n)

/** One segment per part, filled once it's bought. */
export function PartDots({ item, className }: { item: WishListItem; className?: string }) {
    const parts = item.parts ?? []
    return (
        <div role="img" className={cn('flex gap-1', className)} aria-label={`${parts.filter(p => p.is_purchased).length} of ${parts.length} parts bought`}>
            {parts.map(p => (
                <span key={p.id} className={cn('flex-1 h-1.5 rounded-full', p.is_purchased ? 'bg-info' : 'bg-line-soft')} />
            ))}
        </div>
    )
}

interface WishRowProps {
    item: WishListItem
    stop: RoadmapStop | undefined
    pace: SavingsPace | null
    today: string
    onOpen: () => void
    /** Offered when a plain wish is saved in full. */
    onBuy: () => void
    /** What's owed on debts, which the usual leftover pays before any wish. */
    owedFirst?: number
}

/**
 * A wish as a Bills row: how far along on the right ("3,8jt of 13jt"), and the next step
 * or the month it's expected under the name. A plain wish saved in full offers Buy.
 */
export function WishRow({ item, stop, pace, today, onOpen, onBuy, owedFirst = 0 }: WishRowProps) {
    const { target, saved, remaining, ready } = wishProgress(item)
    const parts = partsBreakdown(item)
    const isUOM = !!item.quantity
    const unit = item.unit ?? ''
    const eta = !ready && stop?.date && stop.periods ? etaPhrase(stop.date, today) : null

    let sub: string
    if (parts) {
        const next = nextPart(item, pace, today, owedFirst)
        sub = `${parts.bought} of ${parts.total} parts`
        if (ready) sub += ' · ready to buy the rest'
        else if (next) sub += ` · next: ${next.part.name}${next.date ? ` ${etaPhrase(next.date, today, 'around')}` : ''}`
    } else if (isUOM) {
        sub = ready ? 'Target reached' : `Bought ${units(item.saved_quantity ?? 0)} ${unit}${eta ? ` · ${eta}` : ''}`
    } else if (ready) {
        sub = 'Saved in full · ready to buy'
    } else if (remaining !== null) {
        sub = `${formatShortCurrency(remaining)} to go${eta ? ` · ${eta}` : ''}`
    } else {
        sub = 'No price yet'
    }

    const amount = isUOM && !parts
        ? { main: `${units(item.saved_quantity ?? 0)} ${unit}`, of: `of ${units(item.quantity ?? 0)} ${unit}` }
        : ready && !parts && target !== null
            ? { main: plain(target), of: null }
            : { main: formatShortCurrency(saved), of: target !== null ? `of ${formatShortCurrency(target)}` : null }

    return (
        <PlanRow
            lead={<WishTile name={item.name} icon={item.icon} />}
            title={item.name}
            sub={sub}
            subClassName={ready ? 'text-brand-ink' : undefined}
            onOpen={onOpen}
            end={ready && !parts && !isUOM
                ? <PillButton onClick={onBuy}>Buy {formatShortCurrency(target ?? saved)}</PillButton>
                : <RowAmount sub={amount.of}>{amount.main}</RowAmount>}
        />
    )
}
