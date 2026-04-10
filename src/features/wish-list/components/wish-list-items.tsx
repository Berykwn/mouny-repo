import { formatCurrency } from '@/lib/helpers'
import type { WishListItem } from '@/types'
import { Trash2, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WishListItemsProps {
  items: WishListItem[]
  onDelete: (id: string) => void
  onBuy: (item: WishListItem) => void
}

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

export function WishListItems({ items, onDelete, onBuy }: WishListItemsProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <p className="text-sm font-medium">No items yet</p>
        <p className="text-xs text-muted-foreground">
          Tap + to add something you want to buy
        </p>
      </div>
    )
  }

  // Group by priority
  const high = items.filter(i => i.priority === 'high')
  const medium = items.filter(i => i.priority === 'medium')
  const low = items.filter(i => i.priority === 'low')

  const grouped = [
    { label: 'High Priority', items: high },
    { label: 'Medium Priority', items: medium },
    { label: 'Low Priority', items: low },
  ].filter(g => g.items.length > 0)

  return (
    <div className="space-y-6">
      {grouped.map(({ label, items: groupItems }) => (
        <div key={label}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {label}
          </p>

          <div className="space-y-2">
            {groupItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border"
              >
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{item.name}</p>

                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                        PRIORITY_COLOR[item.priority ?? 'low']
                      )}
                    >
                      {PRIORITY_LABEL[item.priority ?? 'low']}
                    </span>
                  </div>

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
                </div>

                {/* Actions - ALWAYS VISIBLE */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onBuy(item)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-foreground text-background font-medium hover:opacity-80 transition-opacity"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    Buy
                  </button>

                  <button
                    onClick={() => onDelete(item.id)}
                    className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}