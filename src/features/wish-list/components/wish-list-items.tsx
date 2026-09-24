import { useState } from 'react'
import { formatCurrency } from '@/lib/helpers'
import type { WishListItem } from '@/types'
import { Trash2, PiggyBank, ShoppingBag, Pencil, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/progress-bar'

interface WishListItemsProps {
  items: WishListItem[]
  onBuy: (item: WishListItem) => void
  onContribute: (item: WishListItem) => void
  onEdit: (item: WishListItem) => void
  onDeleteRequest: (id: string) => void
}

type Filter = 'all' | 'high' | 'medium' | 'low'

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Urgent',
  medium: 'Medium',
  low: 'Casual',
}

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-negative/10 text-negative',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-surface-hover text-muted-ink',
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export function WishListItems({ items, onBuy, onContribute, onEdit, onDeleteRequest }: WishListItemsProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const counts = {
    all: items.length,
    high: items.filter(i => i.priority === 'high').length,
    medium: items.filter(i => i.priority === 'medium').length,
    low: items.filter(i => i.priority === 'low').length,
  }

  const FILTERS = [
    { id: 'all' as Filter, label: `All (${counts.all})` },
    { id: 'high' as Filter, label: `Urgent (${counts.high})` },
    { id: 'medium' as Filter, label: `Medium (${counts.medium})` },
    { id: 'low' as Filter, label: `Casual (${counts.low})` },
  ].filter(f => f.id === 'all' || counts[f.id] > 0)

  const filtered = (filter === 'all' ? items : items.filter(i => i.priority === filter))
    .slice()
    .sort((a, b) => PRIORITY_ORDER[a.priority ?? 'low'] - PRIORITY_ORDER[b.priority ?? 'low'])

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors',
              filter === id
                ? 'bg-surface-hover text-ink border-line'
                : 'bg-white text-muted-ink border-line hover:text-ink'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Item list */}
      <div className="card overflow-hidden divide-y divide-line-soft">
        {filtered.map((item) => {
          const isUOM = !!item.quantity
          const hasTarget = isUOM
            ? item.quantity! > 0
            : !!item.estimated_price && item.estimated_price > 0
          const percent = hasTarget
            ? Math.round(isUOM
              ? ((item.saved_quantity ?? 0) / item.quantity!) * 100
              : (item.saved_amount / item.estimated_price!) * 100)
            : 0
          const ready = hasTarget && (isUOM
            ? (item.saved_quantity ?? 0) >= item.quantity!
            : item.saved_amount >= item.estimated_price!)
          const isOpen = openIds.has(item.id)

          return (
            <div
              key={item.id}
              className={cn('transition-colors duration-200', isOpen && 'bg-surface-hover')}
            >
              <button
                onClick={() => toggle(item.id)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors',
                  !isOpen && 'hover:bg-surface-soft'
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-ink truncate">{item.name}</p>
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                      PRIORITY_COLOR[item.priority ?? 'low']
                    )}>
                      {PRIORITY_LABEL[item.priority ?? 'low']}
                    </span>
                  </div>
                  <p className={cn('text-[11.5px] mt-0.5 tabular-nums', ready ? 'text-positive' : 'text-muted-ink')}>
                    {isUOM ? `${item.saved_quantity ?? 0} ${item.unit}` : formatCurrency(item.saved_amount)}
                    {hasTarget && (
                      <span className="text-muted-ink">
                        {' '}of {isUOM ? `${item.quantity} ${item.unit}` : formatCurrency(item.estimated_price!)}
                      </span>
                    )}
                  </p>
                </div>

                <ChevronDown className={cn(
                  'w-3.5 h-3.5 text-muted-ink transition-transform shrink-0',
                  isOpen && 'rotate-180'
                )} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 space-y-2.5">
                  {item.quantity && item.unit && (
                    <p className="text-[11px] text-muted-ink tabular-nums">
                      {item.quantity} {item.unit} &times; {formatCurrency(item.price_per_unit ?? 0)}
                    </p>
                  )}

                  {/* Progress toward target */}
                  {hasTarget ? (
                    <div className="space-y-1">
                      <ProgressBar percent={percent} color={ready ? 'var(--positive)' : undefined} />
                      {ready ? (
                        <span className="inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-positive/10 text-positive">
                          {isUOM ? 'Selesai' : 'Ready to buy'}
                        </span>
                      ) : (
                        <p className="text-[11px] text-muted-ink">
                          {percent}% {isUOM ? 'terkumpul' : 'saved'}
                          {isUOM && ` · ${formatCurrency(item.saved_amount)} spent`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-ink">No target price set</p>
                  )}

                  {/* Notes — only if exists */}
                  {item.notes && (
                    <p className="text-[11.5px] text-muted-ink">{item.notes}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-line-soft">
                    {isUOM ? (
                      <Button variant="outline" size="sm" className="rounded-[10px]" onClick={() => onContribute(item)}>
                        <PiggyBank className="w-3.5 h-3.5 mr-1 mt-0.5" />
                        Cicil
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="rounded-[10px]" onClick={() => onContribute(item)}>
                          <PiggyBank className="w-3.5 h-3.5 mr-1 mt-0.5" />
                          Add funds
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-[10px]" onClick={() => onBuy(item)}>
                          <ShoppingBag className="w-3.5 h-3.5 mr-1 mt-0.5" />
                          Buy
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-[10px]"
                      onClick={() => onEdit(item)}
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-[10px]"
                      onClick={() => onDeleteRequest(item.id)}
                      aria-label={`Remove ${item.name} from wish list`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
