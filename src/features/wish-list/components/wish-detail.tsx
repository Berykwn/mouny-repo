import { Pencil, Trash2, PiggyBank, ShoppingBag, Check, Undo2, ListPlus } from 'lucide-react'
import FlagIcon from '~icons/ph/flag-banner-duotone'
import CalendarIcon from '~icons/ph/calendar-check-duotone'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/progress-bar'
import type { WishListItem, WishPart } from '@/types'
import {
    formatMonthYear, partsBreakdown, targetPlan, wishProgress,
    type RoadmapStop, type SavingsPace, type TargetPlan,
} from '../lib/wish-analytics'
import { WishTile } from './wish-tile'

const PRIORITY_LABEL: Record<string, string> = { high: 'Urgent', medium: 'Medium', low: 'Casual' }

const STATUS_PILL: Record<TargetPlan['status'], { label: string; className: string }> = {
    'done': { label: 'Funded', className: 'bg-positive/10 text-positive' },
    'on-track': { label: 'On track', className: 'bg-positive/10 text-positive' },
    'behind': { label: 'Behind', className: 'bg-warning/10 text-warning' },
    'overdue': { label: 'Date passed', className: 'bg-negative/10 text-negative' },
    'unknown': { label: 'No pace yet', className: 'bg-surface-hover text-muted-ink' },
}

const PRIMARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors flex items-center justify-center gap-2'
const SECONDARY_BTN = 'w-full h-12 rounded-[14px] text-[13px] font-semibold border border-line text-ink hover:bg-surface-hover transition-colors flex items-center justify-center gap-2'

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
    const isUOM = !!item.quantity
    const unit = item.unit ?? ''
    const { target, saved, remaining, percent, ready } = wishProgress(item)
    const parts = partsBreakdown(item)
    const plan = targetPlan(item, stop, pace)
    const periodWord = (n: number) => `period${n === 1 ? '' : 's'}`

    return (
        <div className="space-y-4 pb-2">
            {/* Identity */}
            <div className="flex items-center gap-3">
                <WishTile name={item.name} icon={item.icon} className="w-14 h-14 rounded-[16px]" iconClassName="w-7 h-7" />
                <div className="min-w-0">
                    <p className="text-[11px] text-muted-ink">{PRIORITY_LABEL[item.priority ?? 'low']} priority</p>
                    {isUOM && (
                        <p className="text-[12px] text-ink tabular-nums mt-0.5">
                            {item.saved_quantity ?? 0} of {item.quantity} {unit} · {formatCurrency(item.price_per_unit ?? 0)}/{unit}
                        </p>
                    )}
                    {item.notes && <p className="text-[12px] text-muted-ink mt-0.5 leading-relaxed">{item.notes}</p>}
                </div>
            </div>

            {/* Progress */}
            <div className="rounded-[20px] border border-line p-4">
                {ready ? (
                    <p className="text-[22px] font-medium tracking-[-0.02em] text-positive">
                        {isUOM ? 'Target reached' : parts ? 'Ready to buy the rest' : 'Ready to buy'}
                    </p>
                ) : remaining !== null ? (
                    <p className="text-[22px] font-medium tracking-[-0.02em] text-ink tabular-nums">
                        {formatCurrency(remaining)}<span className="text-[12px] font-normal text-muted-ink"> to go</span>
                    </p>
                ) : (
                    <p className="text-[15px] font-medium text-ink">No price yet</p>
                )}
                {target !== null ? (
                    <>
                        <ProgressBar percent={percent} color={ready ? 'var(--positive)' : undefined} className="mt-3 h-1.5" />
                        <p className="mt-2 text-[11.5px] text-muted-ink tabular-nums">
                            {formatCurrency(saved)} of {formatCurrency(target)} · {percent}%
                        </p>
                        {parts && (parts.spent > 0 || item.saved_amount > 0) && (
                            <p className="mt-0.5 text-[11px] text-subtle-ink tabular-nums">
                                {formatCurrency(parts.spent)} spent on parts · {formatCurrency(item.saved_amount)} set aside
                            </p>
                        )}
                        {parts && parts.unpriced > 0 && (
                            <p className="mt-0.5 text-[11px] text-warning">
                                {parts.unpriced} part{parts.unpriced === 1 ? '' : 's'} without a price yet
                            </p>
                        )}
                    </>
                ) : (
                    <p className="mt-1 text-[11.5px] text-muted-ink">
                        {formatCurrency(saved)} saved. Add a price to see progress and an estimate.
                    </p>
                )}
            </div>

            {/* Parts: a split wish is bought a piece at a time */}
            {parts && (
                <div className="rounded-[20px] border border-line overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
                        <p className="text-[12.5px] font-medium text-ink">Parts</p>
                        <p className="text-[11.5px] text-muted-ink tabular-nums">{parts.bought} of {parts.total} bought</p>
                    </div>
                    <ul className="border-t border-line-soft divide-y divide-line-soft">
                        {item.parts!.map(part => (
                            <li key={part.id} className="flex items-center gap-3 px-4 py-2.5">
                                <span className={cn(
                                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                                    part.is_purchased ? 'bg-positive/15 text-positive' : 'border border-line',
                                )}>
                                    {part.is_purchased && <Check className="w-3 h-3" />}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className={cn('text-[13px] truncate', part.is_purchased ? 'text-muted-ink' : 'text-ink')}>{part.name}</p>
                                    <p className="text-[11px] text-muted-ink tabular-nums">
                                        {part.is_purchased
                                            ? <>{formatCurrency(part.paid_amount ?? 0)}{part.purchased_on && <> · {formatDate(part.purchased_on)}</>}{!part.transaction_id && ' · not recorded'}</>
                                            : part.estimated_price ? `Est. ${formatCurrency(part.estimated_price)}` : 'No price yet'}
                                    </p>
                                </div>
                                {part.is_purchased ? (
                                    <button
                                        type="button"
                                        onClick={() => onUndoPart(part)}
                                        className="flex items-center gap-1 text-[11.5px] font-medium text-muted-ink hover:text-ink px-2 py-1.5"
                                    >
                                        <Undo2 className="w-3.5 h-3.5" /> Undo
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => onBuyPart(part)}
                                        className="flex items-center gap-1 text-[11.5px] font-semibold text-brand border border-line rounded-full px-3 py-1.5 hover:bg-surface-hover"
                                    >
                                        <ShoppingBag className="w-3.5 h-3.5" /> Buy
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        onClick={onEditParts}
                        className="w-full flex items-center justify-center gap-1.5 border-t border-line-soft py-2.5 text-[12px] font-medium text-brand hover:bg-surface-soft"
                    >
                        <ListPlus className="w-3.5 h-3.5" /> Edit parts
                    </button>
                </div>
            )}

            {/* Plan: deadline first, then the pace-based estimate */}
            {!ready && (plan || stop) && (
                <div className="rounded-[20px] bg-surface-soft border border-line-soft p-4 space-y-3">
                    {plan && (
                        <div className="flex gap-3">
                            <FlagIcon className="w-5 h-5 text-info shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[12.5px] font-medium text-ink">Want it by {formatDate(plan.targetDate)}</p>
                                    <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0', STATUS_PILL[plan.status].className)}>
                                        {STATUS_PILL[plan.status].label}
                                    </span>
                                </div>
                                <p className="text-[11.5px] text-muted-ink mt-1 leading-relaxed">
                                    {plan.status === 'overdue'
                                        ? 'That date has passed — pick a new one so the plan can adjust.'
                                        : <>Set aside <span className="text-ink font-medium tabular-nums">{formatCurrency(Math.round(plan.perPeriodNeeded))}</span> each period for {plan.periodsLeft} {periodWord(plan.periodsLeft)} to make it.</>}
                                    {plan.status === 'behind' && pace && pace.perPeriod > 0 && (
                                        <> You usually have {formatCurrency(Math.round(pace.perPeriod))} left per period, shared across your wishes.</>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                    {stop && (
                        <div className="flex gap-3">
                            <CalendarIcon className="w-5 h-5 text-muted-ink shrink-0 mt-0.5" />
                            <p className="text-[11.5px] text-muted-ink leading-relaxed">
                                {stop.date && stop.periods
                                    ? <>At your usual pace (urgent wishes first) you’ll have it around <span className="text-ink font-medium">{formatMonthYear(stop.date)}</span>, in ~{stop.periods} {periodWord(stop.periods)}.</>
                                    : pace
                                        ? 'No estimate yet — recent periods didn’t leave anything over.'
                                        : 'An estimate appears once you’ve closed a period.'}
                            </p>
                        </div>
                    )}
                    {!plan && target !== null && (
                        <button type="button" onClick={onEdit} className="text-[11.5px] font-medium text-brand hover:underline">
                            Add a “want it by” date for a per-period plan
                        </button>
                    )}
                </div>
            )}

            {/* Actions: one clear primary, the rest quiet */}
            <div className="space-y-2 pt-1">
                {isUOM ? (
                    <button type="button" onClick={onContribute} className={PRIMARY_BTN}>
                        <PiggyBank className="w-4 h-4" /> Cicil
                    </button>
                ) : parts ? (
                    // Bought part by part from the list above, so only saving up lives here.
                    <button type="button" onClick={onContribute} className={ready ? SECONDARY_BTN : PRIMARY_BTN}>
                        <PiggyBank className="w-4 h-4" /> Add funds
                    </button>
                ) : ready ? (
                    <>
                        <button type="button" onClick={onBuy} className={PRIMARY_BTN}>
                            <ShoppingBag className="w-4 h-4" /> Record purchase
                        </button>
                        <button type="button" onClick={onContribute} className={SECONDARY_BTN}>
                            <PiggyBank className="w-4 h-4" /> Add funds
                        </button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={onContribute} className={PRIMARY_BTN}>
                            <PiggyBank className="w-4 h-4" /> Add funds
                        </button>
                        <button type="button" onClick={onBuy} className={SECONDARY_BTN}>
                            <ShoppingBag className="w-4 h-4" /> Buy it now
                        </button>
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
