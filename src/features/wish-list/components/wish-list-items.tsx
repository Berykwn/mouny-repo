import { useState } from 'react'
import { formatCurrency } from '@/lib/helpers'
import type { WishListItem } from '@/types'
import type { WishListAnalysis } from '@/services/wish-list.service'
import { Trash2, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WishListItemsProps {
  items: WishListItem[]
  analysis: Record<string, WishListAnalysis>
  onBuy: (item: WishListItem) => void
  onDeleteRequest: (id: string) => void
}

type Filter = 'all' | 'high' | 'medium' | 'low'

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Urgent',
  medium: 'Medium',
  low: 'Casual',
}

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400',
  medium: 'bg-amber-50 text-amber-500 dark:bg-amber-950 dark:text-amber-400',
  low: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400',
}

export function WishListItems({ items, analysis, onBuy, onDeleteRequest }: WishListItemsProps) {
  const [filter, setFilter] = useState<Filter>('all')

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">Your wish list is empty</p>
        <p className="text-xs text-muted-foreground">Add items you want to buy later</p>
      </div>
    )
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

  const filtered = filter === 'all' ? items : items.filter(i => i.priority === filter)

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filter === id
                ? 'bg-neutral-200 text-neutral-600 border-neutral-200'
                : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Item list */}
      <div className="space-y-2.5">
        {filtered.map((item) => {
          const a = analysis[item.id]

          return (
            <div
              key={item.id}
              className="bg-card rounded-2xl border border-neutral-200 px-4 py-3.5 space-y-2.5"
            >
              {/* Header: title + badges */}
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-semibold truncate flex-1">{item.name}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    PRIORITY_COLOR[item.priority ?? 'low']
                  )}>
                    {PRIORITY_LABEL[item.priority ?? 'low']}
                  </span>
                  {a && a.price > 0 && (
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      a.canAfford
                        ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400'
                        : 'bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400'
                    )}>
                      {a.canAfford ? 'Can afford' : `-${formatCurrency(a.shortfall)}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Body: notes — only if exists */}
              {item.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>
              )}

              {/* Footer: price + salary label | Buy + Delete */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <p className="text-sm font-semibold shrink-0">
                    {item.estimated_price ? formatCurrency(item.estimated_price) : '—'}
                  </p>
                  {a?.salaryLabel && (
                    <span className="text-[10px] text-muted-foreground truncate">· {a.salaryLabel}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onBuy(item)}
                    className="text-[11px] font-semibold px-3 py-1 rounded-full bg-secondary text-secondary-foreground"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => onDeleteRequest(item.id)}
                    className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}