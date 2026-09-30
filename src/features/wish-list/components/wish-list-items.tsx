import { useState } from 'react'
import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import type { WishListItem } from '@/types'
import SparkleIcon from '~icons/ph/sparkle-duotone'
import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/progress-bar'
import {
  formatMonthYear, sortWishes, targetPlan, wishProgress,
  type RoadmapStop, type SavingsPace, type TargetPlan,
} from '../lib/wish-analytics'
import { WishTile } from './wish-tile'

interface WishListItemsProps {
  items: WishListItem[]
  roadmap: RoadmapStop[]
  pace: SavingsPace | null
  /** Tapping a card opens its detail sheet, where the actions live. */
  onOpen: (item: WishListItem) => void
}

type Filter = 'all' | 'high' | 'medium' | 'low'

const STATUS_TEXT: Record<TargetPlan['status'], string> = {
  'done': 'text-positive',
  'on-track': 'text-positive',
  'behind': 'text-warning',
  'overdue': 'text-negative',
  'unknown': 'text-muted-ink',
}

/** The one line under the bar: the deadline's status when there is one, else the estimate. */
function metaLine(plan: TargetPlan | null, stop: RoadmapStop | undefined): { text: string; className: string } | null {
  if (plan) {
    const by = `By ${formatMonthYear(plan.targetDate)}`
    switch (plan.status) {
      case 'on-track': return { text: `${by} · on track`, className: STATUS_TEXT['on-track'] }
      case 'behind': return { text: `${by} · ${formatShortCurrency(Math.round(plan.perPeriodNeeded))}/period needed`, className: STATUS_TEXT.behind }
      case 'overdue': return { text: `${by} · date passed`, className: STATUS_TEXT.overdue }
      case 'unknown': return { text: by, className: STATUS_TEXT.unknown }
      case 'done': return null
    }
  }
  if (stop?.date && stop.periods) return { text: `Expected ~${formatMonthYear(stop.date)}`, className: 'text-muted-ink' }
  return null
}

export function WishListItems({ items, roadmap, pace, onOpen }: WishListItemsProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const stopById = new Map(roadmap.map(s => [s.item.id, s]))

  const counts = {
    all: items.length,
    high: items.filter(i => i.priority === 'high').length,
    medium: items.filter(i => i.priority === 'medium').length,
    low: items.filter(i => i.priority === 'low').length,
  }

  const FILTERS = [
    { id: 'all' as Filter, label: 'All', count: counts.all },
    { id: 'high' as Filter, label: 'Urgent', count: counts.high },
    { id: 'medium' as Filter, label: 'Medium', count: counts.medium },
    { id: 'low' as Filter, label: 'Casual', count: counts.low },
  ].filter(f => f.id === 'all' || f.count > 0)

  const filtered = sortWishes(filter === 'all' ? items : items.filter(i => i.priority === filter))

  return (
    <div className="space-y-3">
      {FILTERS.length > 2 && (
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(({ id, label, count }) => (
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
              {label} ({count})
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((item) => {
          const { target, remaining, percent, ready } = wishProgress(item)
          const stop = stopById.get(item.id)
          const meta = ready ? null : metaLine(targetPlan(item, stop, pace), stop)

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              className={cn(
                'card p-4 text-left transition-colors hover:bg-surface-soft active:bg-surface-hover',
                ready && 'border-positive/40'
              )}
            >
              <div className="flex items-center gap-3">
                <WishTile name={item.name} icon={item.icon} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">{item.name}</p>
                  {ready ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[16px] font-medium tracking-[-0.01em] text-positive">
                      <SparkleIcon className="w-4 h-4" />
                      {item.quantity ? 'Target reached' : 'Ready to buy'}
                    </p>
                  ) : remaining !== null ? (
                    <p className="mt-0.5 text-[16px] font-medium tracking-[-0.01em] text-ink tabular-nums truncate">
                      {formatCurrency(remaining)}
                      <span className="text-[11px] font-normal text-muted-ink"> to go</span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[12px] text-muted-ink">No price yet</p>
                  )}
                </div>
              </div>

              {target !== null && (
                <>
                  <ProgressBar
                    percent={percent}
                    color={ready ? 'var(--positive)' : undefined}
                    className="mt-3.5"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-muted-ink tabular-nums shrink-0">{percent}% saved</span>
                    {meta && <span className={cn('truncate', meta.className)}>{meta.text}</span>}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
