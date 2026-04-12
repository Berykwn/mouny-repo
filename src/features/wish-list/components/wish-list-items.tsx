import { useState } from 'react'
import { formatCurrency } from '@/lib/helpers'
import type { WishListItem } from '@/types'
import type { WishListAnalysis } from '@/services/wish-list.service'
import { Trash2, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface WishListItemsProps {
  items: WishListItem[]
  analysis: Record<string, WishListAnalysis>
  onBuy: (item: WishListItem) => void
  onDeleteRequest: (id: string) => void
}

type Filter = 'all' | 'high' | 'medium' | 'low'

const PRIORITY_LABEL: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const PRIORITY_COLOR: Record<string, string> = {
  high: 'text-red-600 bg-red-100 dark:bg-red-900/40',
  medium: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40',
  low: 'text-muted-foreground bg-muted',
}

export function WishListItems({ items, analysis, onBuy, onDeleteRequest }: WishListItemsProps) {
  const [filter, setFilter] = useState<Filter>('all')

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <p className="text-sm font-medium">Your wish list is empty</p>
        <p className="text-xs text-muted-foreground">Tap + to add something you want to buy</p>
      </div>
    )
  }

  const counts = {
    all: items.length,
    high: items.filter(i => i.priority === 'high').length,
    medium: items.filter(i => i.priority === 'medium').length,
    low: items.filter(i => i.priority === 'low').length,
  }

  const filtered = filter === 'all'
    ? items
    : items.filter(i => i.priority === filter)

  const FILTERS = [
    { id: 'all' as Filter, label: `All (${counts.all})` },
    { id: 'high' as Filter, label: `High (${counts.high})` },
    { id: 'medium' as Filter, label: `Medium (${counts.medium})` },
    { id: 'low' as Filter, label: `Low (${counts.low})` },
  ].filter(f => f.id === 'all' || counts[f.id] > 0)

  return (
    <div className="space-y-4">

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              filter === id
                ? 'bg-neutral-200 text-neutral-600 border-neutral-200'
                : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const a = analysis[item.id]

          return (
            <div key={item.id} className="p-3 rounded-xl bg-card border space-y-2">

              {/* Name + badge + actions */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <span className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                      PRIORITY_COLOR[item.priority ?? 'low']
                    )}>
                      {PRIORITY_LABEL[item.priority ?? 'low']}
                    </span>
                  </div>

                  {(item.estimated_price || item.notes) && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.estimated_price && (
                        <p className="text-xs text-muted-foreground">
                          ~{formatCurrency(item.estimated_price)}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground truncate">
                          · {item.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => onBuy(item)}>
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDeleteRequest(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Analysis */}
              {a && a.price > 0 && (
                <div className="flex items-center gap-3 border-t pt-2">
                  <div className="text-[11px]">
                    <span className="text-muted-foreground">Balance: </span>
                    <span className={cn(
                      'font-medium',
                      a.canAfford ? 'text-green-600' : 'text-destructive'
                    )}>
                      {a.canAfford
                        ? 'Affordable'
                        : `Short ${formatCurrency(a.shortfall)}`
                      }
                    </span>
                  </div>

                  {a.salaryLabel && (
                    <>
                      <div className="w-px h-3 bg-border" />
                      <p className="text-[11px] text-muted-foreground">
                        {a.salaryLabel}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}