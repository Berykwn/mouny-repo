import { useState } from 'react'
import { formatCurrency } from '@/lib/helpers'
import type { WishListItem } from '@/types'
import { Trash2, PiggyBank, ShoppingBag, Pencil } from 'lucide-react'
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
  high: 'bg-[#fef2f2] text-[#dc2626]',
  medium: 'bg-[#fff7ed] text-[#d97706]',
  low: 'bg-[#f4f4f2] text-[#8a8a84]',
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export function WishListItems({ items, onBuy, onContribute, onEdit, onDeleteRequest }: WishListItemsProps) {
  const [filter, setFilter] = useState<Filter>('all')

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
                ? 'bg-[#f4f4f2] text-[#252525] border-[#e5e5e5]'
                : 'bg-white text-[#8a8a84] border-[#e5e5e5] hover:text-[#252525]'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Item list */}
      <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
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

          return (
            <div
              key={item.id}
              className="rounded-[20px] border border-[#e5e5e5] bg-white px-4 py-3.5 space-y-2.5"
            >
              {/* Header: title + priority | saved of target */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-[#252525] truncate">{item.name}</p>
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                      PRIORITY_COLOR[item.priority ?? 'low']
                    )}>
                      {PRIORITY_LABEL[item.priority ?? 'low']}
                    </span>
                  </div>
                  {item.quantity && item.unit && (
                    <p className="text-[11px] text-[#8a8a84] mt-0.5 tabular-nums">
                      {item.quantity} {item.unit} &times; {formatCurrency(item.price_per_unit ?? 0)}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {isUOM ? (
                    <>
                      <p className="text-[13px] font-medium text-[#252525] tabular-nums">
                        {item.saved_quantity ?? 0} {item.unit}
                      </p>
                      {hasTarget && (
                        <p className="text-[11px] text-[#8a8a84] tabular-nums">of {item.quantity} {item.unit}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] font-medium text-[#252525] tabular-nums">
                        {formatCurrency(item.saved_amount)}
                      </p>
                      {hasTarget && (
                        <p className="text-[11px] text-[#8a8a84] tabular-nums">of {formatCurrency(item.estimated_price!)}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Progress toward target */}
              {hasTarget ? (
                <div className="space-y-1">
                  <ProgressBar percent={percent} />
                  {ready ? (
                    <span className="inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f2f6ea] text-[#4d7a1d]">
                      {isUOM ? 'Selesai' : 'Ready to buy'}
                    </span>
                  ) : (
                    <p className="text-[11px] text-[#8a8a84]">
                      {percent}% {isUOM ? 'terkumpul' : 'saved'}
                      {isUOM && ` · ${formatCurrency(item.saved_amount)} spent`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-[#8a8a84]">No target price set</p>
              )}

              {/* Body: notes — only if exists */}
              {item.notes && (
                <p className="text-[11.5px] text-[#8a8a84] line-clamp-2">{item.notes}</p>
              )}

              {/* Footer: actions */}
              <div className="flex items-center justify-end gap-1.5 pt-0.5">
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
          )
        })}
      </div>
    </div>
  )
}
