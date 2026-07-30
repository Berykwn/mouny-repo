import { useState } from 'react'
import { formatCurrency } from '@/lib/helpers'
import type { WishListItem } from '@/types'
import type { WishListAnalysis } from '@/services/wish-list.service'
import { Trash2 } from 'lucide-react'
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
  high: 'bg-[#fef2f2] text-[#dc2626]',
  medium: 'bg-[#fff7ed] text-[#d97706]',
  low: 'bg-[#f4f4f2] text-[#8a8a84]',
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export function WishListItems({ items, analysis, onBuy, onDeleteRequest }: WishListItemsProps) {
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
      <div className="space-y-2.5">
        {filtered.map((item) => {
          const a = analysis[item.id]

          return (
            <div
              key={item.id}
              className="rounded-[20px] border border-[#e5e5e5] bg-white px-4 py-3.5 space-y-2.5"
            >
              {/* Header: title + badges */}
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-[13px] font-semibold text-[#252525] truncate flex-1">{item.name}</p>
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
                      a.canAfford ? 'bg-[#f2f6ea] text-[#4d7a1d]' : 'bg-[#fef2f2] text-[#dc2626]'
                    )}>
                      {a.canAfford ? 'Can afford' : `-${formatCurrency(a.shortfall)}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Body: notes — only if exists */}
              {item.notes && (
                <p className="text-[11.5px] text-[#8a8a84] line-clamp-2">{item.notes}</p>
              )}

              {/* Footer: price + salary label | Buy + Delete */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <p className="text-[13px] font-medium text-[#252525] shrink-0">
                    {item.estimated_price ? formatCurrency(item.estimated_price) : '—'}
                  </p>
                  {a?.salaryLabel && (
                    <span className="text-[10px] text-[#8a8a84] truncate">· {a.salaryLabel}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onBuy(item)}
                    className="text-[11px] font-medium px-3 py-1 rounded-full border border-[#e5e5e5] text-[#252525] hover:bg-[#f4f4f2] transition-colors"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => onDeleteRequest(item.id)}
                    aria-label={`Remove ${item.name} from wish list`}
                    className="w-7 h-7 rounded-lg bg-[#fef2f2] flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#dc2626]" />
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
