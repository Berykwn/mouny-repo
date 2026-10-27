import type { ReactNode } from 'react'
import SparkleIcon from '~icons/ph/sparkle-duotone'
import { Pencil, Trash2, Check, ListPlus } from 'lucide-react'
import PiggyIcon from '~icons/ph/piggy-bank-duotone'
import FlagIcon from '~icons/ph/flag-banner-duotone'
import CalendarIcon from '~icons/ph/calendar-check-duotone'
import { formatCurrency, formatDate, formatShortCurrency, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { WishListItem, WishPart } from '@/types'
import { SmartLine } from '@/features/plan/components/smart-line'
import {
    formatMonthYear, nextPart, partsBreakdown, targetPlan, wishProgress,
    type RoadmapStop, type SavingsPace,
} from '../lib/wish-analytics'
import { PartDots } from './wish-card'

const PRIORITY_LABEL: Record<string, string> = { high: 'Urgent', medium: 'Medium', low: 'Casual' }

const PRIMARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors flex items-center justify-center gap-2'
const SECONDARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold bg-surface-hover text-ink hover:bg-line-soft transition-colors flex items-center justify-center gap-2'

const plain = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))
const units = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(n)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const longMonth = (date: string, today: string) => {
    const [y, m] = date.split('-').map(Number)
    return y === Number(today.slice(0, 4)) ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`
}

interface WishDetailProps {
    item: WishListItem
    stop: RoadmapStop | undefined
    pace: SavingsPace | null
    onContribute: () => void
    onBuy: () => void
    onEdit: () => void
    onDelete: () => void
    /** Split the wish into parts, or change its parts. */
    onEditParts: () => void
    onBuyPart: (part: WishPart) => void
    onUndoPart: (part: WishPart) => void
}

/** Everything about one wish, and its actions — kept off the card so the list stays calm. */
export function WishDetail({ item, stop, pace, onContribute, onBuy, onEdit, onDelete, onEditParts, onBuyPart, onUndoPart }: WishDetailProps) {
    const today = toISODate()
    const isUOM = !!item.quantity
    const unit = item.unit ?? ''
    const { target, saved, remaining, percent, ready } = wishProgress(item)
    const parts = partsBreakdown(item)
    const plan = targetPlan(item, stop, pace)
    const next = parts ? nextPart(item, pace, today) : null
    const saveLabel = isUOM ? 'Cicil' : 'Add funds'
    const periodWord = (n: number) => `period${n === 1 ? '' : 's'}`

    const label = parts
        ? `${parts.bought} of ${parts.total} parts${target !== null ? ` · Rp ${formatShortCurrency(saved)} of ${formatShortCurrency(target)}` : ''}`
        : isUOM
            ? `${units(item.saved_quantity ?? 0)} of ${units(item.quantity ?? 0)} ${unit} · ${formatCurrency(item.price_per_unit ?? 0)}/${unit}`
            : `${PRIORITY_LABEL[item.priority ?? 'low']} priority`

    // The one smart line: the next part, the date wanted, or the usual-pace estimate, with what to do.
    let smart: { icon: typeof PiggyIcon; text: ReactNode; action: { label: string; onClick: () => void } } | null = null
    if (next && !ready) {
        smart = next.remaining === 0
            ? { icon: PiggyIcon, text: <><b>{formatCurrency(next.saved)}</b> set aside covers the {next.part.name}.</>, action: { label: `Buy ${next.part.name}`, onClick: () => onBuyPart(next.part) } }
            : {
                icon: PiggyIcon,
                text: next.remaining === null
                    ? <><b>{formatCurrency(next.saved)}</b> saved toward the next part. Give the {next.part.name} a price to see when it fits.</>
                    : <>
                        <b>{formatCurrency(next.saved)}</b> saved toward the next part.
                        {next.date
                            ? <> The {next.part.name} fits around <b>{longMonth(next.date, today)}</b> if your usual leftover goes here.</>
                            : <> {formatCurrency(next.remaining)} to go for the {next.part.name}.</>}
                    </>,
                action: { label: 'Add funds', onClick: onContribute },
            }
    } else if (!ready && plan && plan.status !== 'done') {
        smart = {
            icon: FlagIcon,
            text: plan.status === 'overdue'
                ? <>You wanted it by {formatDate(plan.targetDate)}, and that date has passed. Pick a new one so the plan can adjust.</>
                : <>
                    To have it by {formatDate(plan.targetDate)}, set aside <b>{formatCurrency(Math.round(plan.perPeriodNeeded))}</b> each period for {plan.periodsLeft} {periodWord(plan.periodsLeft)}.
                    {plan.status === 'behind' && pace && pace.perPeriod > 0 && <> You usually have {formatShortCurrency(Math.round(pace.perPeriod))} left over, shared across your wishes.</>}
                    {plan.status === 'on-track' && <> You’re on track.</>}
                </>,
            action: plan.status === 'overdue' ? { label: 'Change the date', onClick: onEdit } : { label: saveLabel, onClick: onContribute },
        }
    } else if (!ready && stop?.date && stop.periods) {
        smart = {
            icon: CalendarIcon,
            text: <>At your usual leftover, urgent wishes first, it’s ready around <b>{formatMonthYear(stop.date)}</b>, in about {stop.periods} {periodWord(stop.periods)}.</>,
            action: { label: saveLabel, onClick: onContribute },
        }
    }

    return (
        <div className="space-y-5 pb-2">
            <div>
                <p className="text-[12.5px] text-muted-ink tabular-nums">{label}</p>
                {ready ? (
                    <p className="mt-1 flex items-center gap-2 text-[26px] font-semibold tracking-[-0.02em] text-brand-ink">
                        <SparkleIcon aria-hidden="true" className="w-6 h-6 shrink-0" />
                        {isUOM ? 'Target reached' : parts ? 'Ready to buy the rest' : 'Ready to buy'}
                    </p>
                ) : remaining !== null ? (
                    <p className="mt-1 text-[32px] font-semibold tracking-[-0.03em] leading-tight text-ink tabular-nums">
                        {formatCurrency(remaining)}<span className="text-[13px] font-normal text-muted-ink"> to go</span>
                    </p>
                ) : (
                    <p className="mt-1 text-[15px] font-medium text-ink">No price yet · {formatCurrency(saved)} saved</p>
                )}
                {parts ? (
                    <PartDots item={item} className="mt-3" />
                ) : target !== null && (
                    <>
                        <div className="mt-3 h-1.5 rounded-full bg-line-soft overflow-hidden">
                            <div className="h-full rounded-full bg-info" style={{ width: `${percent}%` }} />
                        </div>
                        <p className="mt-1.5 text-[12px] text-muted-ink tabular-nums">{formatCurrency(saved)} of {formatCurrency(target)} · {percent}%</p>
                    </>
                )}
                {parts && parts.unpriced > 0 && (
                    <p className="mt-1.5 text-[11.5px] text-warning">{parts.unpriced} part{parts.unpriced === 1 ? '' : 's'} without a price yet</p>
                )}
                {item.notes && <p className="mt-2 text-[12.5px] text-muted-ink leading-relaxed">{item.notes}</p>}
            </div>

            {smart ? (
                <SmartLine icon={smart.icon} actions={[smart.action]}>{smart.text}</SmartLine>
            ) : !ready && target !== null && !pace && (
                <p className="text-[12px] text-muted-ink leading-relaxed">A month estimate appears once you’ve closed a period: it’s based on what you usually have left over.</p>
            )}

            {/* Parts: a split wish is bought a piece at a time */}
            {parts && (
                <section>
                    <div className="flex items-baseline justify-between">
                        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Parts</h3>
                        <button type="button" onClick={onEditParts} className="text-[13px] font-semibold text-brand-ink hover:text-brand">Edit</button>
                    </div>
                    <ul className="divide-y divide-line-soft">
                        {item.parts!.map(part => {
                            const isNext = next?.part.id === part.id
                            return (
                                <li key={part.id} className="flex items-center gap-3 py-2.5">
                                    <span className={cn(
                                        'w-6 h-6 rounded-[7px] flex items-center justify-center shrink-0',
                                        part.is_purchased ? 'bg-info text-on-action' : 'border border-line bg-surface',
                                    )}>
                                        {part.is_purchased && <Check className="w-3.5 h-3.5" strokeWidth={2.6} />}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[14px] text-ink truncate">{part.name}</p>
                                        <p className="text-[12px] text-muted-ink tabular-nums truncate">
                                            {part.is_purchased
                                                ? <>Bought{part.purchased_on && <> · {formatDate(part.purchased_on)}</>}{!part.transaction_id && ' · not recorded'}</>
                                                : !part.estimated_price ? 'No price yet' : isNext ? 'Next' : 'Later'}
                                        </p>
                                    </div>
                                    {part.is_purchased ? (
                                        <div className="text-right shrink-0">
                                            <p className="text-[14px] tabular-nums text-muted-ink">{plain(part.paid_amount ?? 0)}</p>
                                            <button type="button" onClick={() => onUndoPart(part)} className="text-[11.5px] font-medium text-subtle-ink hover:text-ink">Undo</button>
                                        </div>
                                    ) : isNext ? (
                                        <button
                                            type="button"
                                            onClick={() => onBuyPart(part)}
                                            className="h-9 px-3.5 rounded-full border border-line bg-surface text-ink text-[13px] font-semibold tabular-nums hover:bg-surface-hover shrink-0"
                                        >
                                            Buy{part.estimated_price ? ` ${formatShortCurrency(part.estimated_price)}` : ''}
                                        </button>
                                    ) : (
                                        <div className="text-right shrink-0">
                                            {part.estimated_price ? <p className="text-[14px] tabular-nums text-ink">{plain(part.estimated_price)}</p> : null}
                                            <button type="button" onClick={() => onBuyPart(part)} className="text-[11.5px] font-semibold text-brand-ink hover:text-brand">Buy</button>
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </section>
            )}

            {/* Actions: one clear primary, the rest quiet */}
            <div className="space-y-2">
                {isUOM ? (
                    <button type="button" onClick={onContribute} className={PRIMARY_BTN}>Cicil</button>
                ) : parts ? (
                    // Bought part by part from the list above, so only saving up lives here.
                    <button type="button" onClick={onContribute} className={SECONDARY_BTN}>Add funds</button>
                ) : ready ? (
                    <>
                        <button type="button" onClick={onBuy} className={PRIMARY_BTN}>Record purchase</button>
                        <button type="button" onClick={onContribute} className={SECONDARY_BTN}>Add funds</button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={onContribute} className={PRIMARY_BTN}>Add funds</button>
                        <button type="button" onClick={onBuy} className={SECONDARY_BTN}>Buy it now</button>
                    </>
                )}

                <div className="flex items-center justify-center gap-6 pt-1">
                    <button type="button" onClick={onEdit} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-ink py-2">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    {!isUOM && !parts && (
                        <button type="button" onClick={onEditParts} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-ink py-2">
                            <ListPlus className="w-3.5 h-3.5" /> Split into parts
                        </button>
                    )}
                    <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-ink hover:text-negative py-2">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                </div>
            </div>
        </div>
    )
}
