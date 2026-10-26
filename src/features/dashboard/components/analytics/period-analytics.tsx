import { useState, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatCurrency, formatDateShort, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { categoryChartColor } from '@/features/categories/lib/category-colors'
import { useBudgets } from '@/queries'
import { groupExpensesByCategory, UNCATEGORIZED_ID, type CategoryTotal } from '../../lib/group-expenses-by-category'
import { CategoryDonutChart } from './category-donut-chart'
import type { TransactionWithDetails } from '@/types'

type CatEntry = CategoryTotal

// Everyday spending per day against the safe daily amount: the bar is the pace, the tick is the limit.
export function PaceGauge({ daily, safe }: { daily: number; safe: number }) {
  const scale = Math.max(daily, safe) * 1.15
  const over = daily > safe
  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full bg-line-soft">
        <div
          className={cn('h-full rounded-full transition-all duration-300', over ? 'bg-warning' : 'bg-brand-ink')}
          style={{ width: `${(daily / scale) * 100}%` }}
        />
        <div
          className="absolute -top-1 -bottom-1 w-[2px] -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${(safe / scale) * 100}%` }}
        />
      </div>
      <div className="relative mt-1 h-3.5">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap text-[10.5px] text-muted-ink"
          style={{ left: `${(safe / scale) * 100}%` }}
        >
          safe {formatShortCurrency(safe)}
        </span>
      </div>
    </div>
  )
}

interface PeriodRangeProps {
  worst: number
  best: number
  /** The middle tick: the median of the other periods. */
  average: number
  current: number
  currentLabel: string
  worstText: string
  bestText: string
}

// Where the average and this period sit between the worst and best of the other periods.
export function PeriodRange({ worst, best, average, current, currentLabel, worstText, bestText }: PeriodRangeProps) {
  const span = best - worst
  if (span <= 0) return null
  const frac = (v: number) => Math.min(1, Math.max(0, (v - worst) / span))
  const pos = (v: number) => `${frac(v) * 100}%`
  // Keep the "This period" label inside the track near either end.
  const labelShift = frac(current) < 0.15 ? 'translate-x-0' : frac(current) > 0.85 ? '-translate-x-full' : '-translate-x-1/2'

  return (
    <div className="px-1 pt-5 pb-1">
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-line-soft via-line to-brand/40">
        <div
          className="absolute top-1/2 h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-ink"
          style={{ left: pos(average) }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink shadow-sm"
          style={{ left: pos(current) }}
        />
        <span
          className={cn('absolute -top-5 whitespace-nowrap text-[10px] font-medium text-ink', labelShift)}
          style={{ left: pos(current) }}
        >
          {currentLabel}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] text-muted-ink">
        <span className="truncate">Worst {worstText}</span>
        <span className="inline-flex items-center gap-1 shrink-0">
          <span className="inline-block h-2.5 w-[2px] rounded-full bg-muted-ink" /> Usual
        </span>
        <span className="truncate text-right">Best {bestText}</span>
      </div>
    </div>
  )
}

interface CategoryTransactionListProps {
  transactions: TransactionWithDetails[]
}

// Inline, collapsible list of the transactions behind a category's total — expanded in place under its row.
function CategoryTransactionList({ transactions }: CategoryTransactionListProps) {
  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.amount - a.amount),
    [transactions]
  )

  return (
    <div className="px-4 pb-3 -mt-1 bg-surface-soft">
      <div className="rounded-[12px] border border-line-soft bg-surface overflow-hidden divide-y divide-line-soft">
        {sorted.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {tx.category?.color && (
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: categoryChartColor(tx.category) }}
                />
              )}
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-ink truncate">
                  {tx.note ?? tx.category?.name ?? 'Expense'}
                </p>
                <p className="text-[10.5px] text-subtle-ink">
                  {formatDateShort(tx.date)}
                  {tx.category && tx.note ? ` · ${tx.category.name}` : ''}
                </p>
              </div>
            </div>
            <p className="text-[12.5px] font-medium text-ink shrink-0 pl-2">{formatCurrency(tx.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Budget progress color: green while comfortably under, amber approaching, red over.
function budgetColor(ratio: number): string {
  if (ratio >= 1) return 'var(--negative)'
  if (ratio >= 0.7) return 'var(--warning)'
  return 'var(--brand-ink)'
}

// ─── Category breakdown ───────────────────────────────────────────────────────

interface CategoryBreakdownProps {
  /** The period's expenses, savings moves included (withSavingsMoves). */
  expenses: TransactionWithDetails[]
  /** Every expense, savings included. */
  totalExpense: number
}

/** The period's expenses by category, with a donut and each budget's progress; a row opens its transactions. */
export function CategoryBreakdown({ expenses, totalExpense }: CategoryBreakdownProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)

  const { data: budgetRows } = useBudgets()
  const budgets = useMemo(() => {
    const map: Record<string, number> = {}
    for (const b of budgetRows ?? []) map[b.category_id] = b.amount
    return map
  }, [budgetRows])

  const categoriesByAmount = useMemo<CatEntry[]>(() => groupExpensesByCategory(expenses), [expenses])

  const expensesByCategoryId = useMemo(() => {
    const map = new Map<string, TransactionWithDetails[]>()
    for (const tx of expenses) {
      const key = tx.category?.id ?? UNCATEGORIZED_ID
      const arr = map.get(key) ?? []
      arr.push(tx)
      map.set(key, arr)
    }
    return map
  }, [expenses])

  // Categories at/near their target float to the top — the first thing you see
  // is what's about to blow its budget. Un-targeted categories come next.
  const sortedCategories = useMemo(() => {
    // A zero budget would divide to Infinity (and Infinity - Infinity is NaN, which breaks
    // the sort): anything spent against it is simply over, so it ranks first.
    const usedShare = (c: CatEntry) => budgets[c.id] > 0 ? c.amount / budgets[c.id] : c.amount > 0 ? Number.MAX_VALUE : 0
    const budgeted = categoriesByAmount
      .filter(c => budgets[c.id] !== undefined)
      .sort((a, b) => usedShare(b) - usedShare(a))
    const unbudgeted = categoriesByAmount.filter(c => budgets[c.id] === undefined)
    return [...budgeted, ...unbudgeted]
  }, [categoriesByAmount, budgets])

  if (sortedCategories.length === 0) return null

  return (
    <div>
      <div className="max-w-[220px] mx-auto">
        <CategoryDonutChart categories={categoriesByAmount} total={totalExpense} />
      </div>

      <div className="-mx-1 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-4">
        {sortedCategories.map(cat => {
          const isExpanded = expandedCategoryId === cat.id
          const pct = totalExpense > 0
            ? Math.round((cat.amount / totalExpense) * 100)
            : null
          const target = budgets[cat.id]
          const ratio = target ? cat.amount / target : null

          return (
            <div key={cat.id} className={cn('border-b border-line-soft', isExpanded && 'sm:col-span-2')}>
              <button
                type="button"
                onClick={() => setExpandedCategoryId(id => id === cat.id ? null : cat.id)}
                aria-expanded={isExpanded}
                className="block w-full text-left px-1 py-2.5 rounded-[10px] hover:bg-surface-soft transition-colors"
              >
                <span className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: categoryChartColor(cat) }}
                    />
                    <span className="text-[13px] text-ink truncate">{cat.name}</span>
                    {target !== undefined && ratio !== null && ratio >= 0.7 && (
                      <span
                        className="text-[10px] font-medium shrink-0 rounded-full px-1.5 py-[1px]"
                        style={{ color: budgetColor(ratio), backgroundColor: `color-mix(in srgb, ${budgetColor(ratio)} 10%, transparent)` }}
                      >
                        {ratio >= 1 ? 'Over' : 'Near budget'}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-[12px] text-subtle-ink min-w-[28px] text-right">
                      {pct !== null ? `${pct}%` : '—'}
                    </span>
                    <span className="text-[13px] font-medium text-ink min-w-[82px] text-right tabular-nums">
                      {formatCurrency(cat.amount)}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className={cn('w-[13px] h-[13px] text-faint-ink shrink-0 transition-transform', isExpanded && 'rotate-90')}
                    />
                  </span>
                </span>

                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="flex-1 h-1 rounded-full bg-line-soft overflow-hidden">
                    <span
                      className="block h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct ?? 0}%`, backgroundColor: categoryChartColor(cat) }}
                    />
                  </span>
                  {target !== undefined && (
                    <span className="text-[10.5px] text-subtle-ink shrink-0">
                      {Math.round((ratio ?? 0) * 100)}% of {formatCurrency(target)} budget
                    </span>
                  )}
                </span>
              </button>

              {isExpanded && <CategoryTransactionList transactions={expensesByCategoryId.get(cat.id) ?? []} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
