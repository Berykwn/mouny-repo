import { useState, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatCurrency, formatDateShort, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { categoryChartColor } from '@/features/categories/lib/category-colors'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { useBillReserve } from '@/hooks/use-bill-reserve'
import { useBudgets } from '@/queries'
import { usePeriodTrend } from '../../hooks/use-period-trend'
import { PeriodTrendChart } from './period-trend-chart'
import { groupExpensesByCategory, UNCATEGORIZED_ID, type CategoryTotal } from '../../lib/group-expenses-by-category'
import { CategoryDonutChart } from './category-donut-chart'
import { KindSplitCard } from './kind-split-card'
import { withSavingsMoves } from '@/lib/savings-moves'
import type { PayPeriod, TransactionWithDetails } from '@/types'

type CatEntry = CategoryTotal

interface PeriodAnalyticsProps {
  transactions: TransactionWithDetails[]
  period: PayPeriod
  periods: PayPeriod[]
  /** Length of the previous period, used to estimate an open period's end. */
  fallbackTotalDays?: number | null
}

// Everyday spending per day against the safe daily amount: the bar is the pace, the tick is the limit.
function PaceGauge({ daily, safe }: { daily: number; safe: number }) {
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
  average: number
  current: number
  currentLabel: string
  worstText: string
  bestText: string
}

// Where the average and this period sit between the worst and best of the other periods.
function PeriodRange({ worst, best, average, current, currentLabel, worstText, bestText }: PeriodRangeProps) {
  const span = best - worst
  if (span <= 0) return null
  const frac = (v: number) => Math.min(1, Math.max(0, (v - worst) / span))
  const pos = (v: number) => `${frac(v) * 100}%`
  // Keep the "This period" label inside the track near either end.
  const labelShift = frac(current) < 0.15 ? 'translate-x-0' : frac(current) > 0.85 ? '-translate-x-full' : '-translate-x-1/2'

  return (
    <div className="px-1 pt-5 pb-1">
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-negative/35 via-line to-positive/35">
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
          <span className="inline-block h-2.5 w-[2px] rounded-full bg-muted-ink" /> Avg
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function PeriodAnalytics({ transactions, period, periods, fallbackTotalDays = null }: PeriodAnalyticsProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)

  const { data: budgetRows } = useBudgets()
  const budgets = useMemo(() => {
    const map: Record<string, number> = {}
    for (const b of budgetRows ?? []) map[b.category_id] = b.amount
    return map
  }, [budgetRows])

  // Money moved into savings accounts counts as saved, like a savings expense.
  const rows = useMemo(() => withSavingsMoves(transactions), [transactions])
  const expenses = useMemo(() => rows.filter(t => t.type === 'expense'), [rows])
  const incomes  = useMemo(() => rows.filter(t => t.type === 'income'),  [rows])

  const totalIncome  = useMemo(() => incomes.reduce((s, t) => s + t.amount, 0), [incomes])
  const totalExpense = useMemo(() => expenses.reduce((s, t) => s + t.amount, 0), [expenses])

  // Savings categories leave the account (so they count toward net) but aren't spending.
  const spending = useMemo(() => expenses.filter(t => !t.category?.is_savings), [expenses])
  const totalSpending = useMemo(() => spending.reduce((s, t) => s + t.amount, 0), [spending])
  const totalSavings = totalExpense - totalSpending

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

  // Tapping a category row expands it in place to the transactions behind its total.
  function categoryTransactions(cat: CatEntry): TransactionWithDetails[] {
    return expensesByCategoryId.get(cat.id) ?? []
  }

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

  // ─── Period stats — delegated to the shared hook ───────────────────────────

  const statsTransactions = useMemo(
    () => [...incomes, ...expenses],
    [incomes, expenses]
  )

  const billReserve = useBillReserve(period, transactions)
  const stats = usePeriodStats({ period, transactions: statsTransactions, fallbackTotalDays, reservedBills: billReserve.reserved })
  const hasPredictive = !stats.isClosed && stats.totalIncome > 0 && stats.projectedSpend !== null
  const overSafePace = stats.safeDaily !== null && stats.dailyAvg > stats.safeDaily

  // ─── Multi-period trend ─────────────────────────────────────────────────────

  const { trend } = usePeriodTrend(periods, period, transactions)

  // ─── Period comparison ──

  // Share of income not spent: what's left plus what went into savings.
  const unspent = totalIncome - totalSpending

  const periodComparison = useMemo(() => {
    const others = trend.filter(t => t.periodId !== period.id)
    if (others.length === 0) return null
    // Ranked by unspent, so a period that moved money into savings isn't marked down for it.
    const best = others.reduce((mx, t) => t.unspent > mx.unspent ? t : mx, others[0])
    const worst = others.reduce((mn, t) => t.unspent < mn.unspent ? t : mn, others[0])
    const average = others.reduce((s, t) => s + t.unspent, 0) / others.length
    // An open period's unspent-so-far would beat every full period early on, so it's
    // compared by where it's projected to end; until there's a projection, not at all.
    const current = stats.isClosed
      ? unspent
      : stats.projectedClose !== null ? stats.projectedClose + stats.totalSavings : null
    const beaten = current === null ? 0 : others.filter(t => current > t.unspent).length
    return { best, worst, average, current, beaten, others: others.length }
  }, [trend, period.id, stats.isClosed, stats.projectedClose, stats.totalSavings, unspent])

  return (
    <>
    <div className="space-y-2.5 pt-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 lg:items-start">

      {/* ── Needs / wants / savings split (Categories) ── */}
      <KindSplitCard expenses={expenses} totalIncome={totalIncome} isClosed={stats.isClosed} />

      {/* ── Budgets card (Categories) ── */}
      {sortedCategories.length > 0 && (
        <div className="rounded-[20px] border border-line bg-surface overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Budgets</p>
            <p className="text-[11px] text-subtle-ink">tap a row for detail</p>
          </div>

          <div className="px-4 pb-1">
            <div className="max-w-[220px] mx-auto">
              <CategoryDonutChart categories={categoriesByAmount} total={totalExpense} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2">
            {sortedCategories.map(cat => {
              const isExpanded = expandedCategoryId === cat.id
              const pct = totalExpense > 0
                ? Math.round((cat.amount / totalExpense) * 100)
                : null
              const target = budgets[cat.id]
              const ratio = target ? cat.amount / target : null

              return (
                <div key={cat.id} className={cn('border-b border-line-soft', isExpanded && 'sm:col-span-2')}>
                  <div
                    onClick={() => setExpandedCategoryId(id => id === cat.id ? null : cat.id)}
                    className="px-4 py-2.5 cursor-pointer hover:bg-surface-soft transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: categoryChartColor(cat) }}
                        />
                        <p className="text-[13px] text-ink truncate">{cat.name}</p>
                        {target !== undefined && ratio !== null && ratio >= 0.7 && (
                          <span
                            className="text-[10px] font-medium shrink-0 rounded-full px-1.5 py-[1px]"
                            style={{ color: budgetColor(ratio), backgroundColor: `color-mix(in srgb, ${budgetColor(ratio)} 10%, transparent)` }}
                          >
                            {ratio >= 1 ? 'Over' : 'Near budget'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[12px] text-subtle-ink min-w-[28px] text-right">
                          {pct !== null ? `${pct}%` : '—'}
                        </span>
                        <span className="text-[13px] font-medium text-ink min-w-[82px] text-right">
                          {formatCurrency(cat.amount)}
                        </span>
                        <ChevronRight
                          className={cn('w-[13px] h-[13px] text-faint-ink shrink-0 transition-transform', isExpanded && 'rotate-90')}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-line-soft overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct ?? 0}%`, backgroundColor: categoryChartColor(cat) }}
                        />
                      </div>
                      {target !== undefined && (
                        <span className="text-[10px] text-subtle-ink shrink-0">
                          {Math.round((ratio ?? 0) * 100)}% of {formatCurrency(target)} budget
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded && <CategoryTransactionList transactions={categoryTransactions(cat)} />}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-hover">
            <p className="text-[12px] text-muted-ink">Total spent</p>
            <p className="text-[13px] font-medium text-ink">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      )}

      {/* ── Spending trend card (Trends) ── */}
      <div className="rounded-[20px] border border-line bg-surface p-4 lg:col-span-2">
        <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Spending trend</p>
        {trend.length >= 2 && (
          <p className="text-[11px] text-subtle-ink mt-0.5 mb-3">Last {trend.length} pay periods</p>
        )}
        <PeriodTrendChart trend={trend} />

        {/* How this period stacks up against the others */}
        {periodComparison && (
          <div className="mt-3 pt-3 border-t border-line-soft">
            <p className="text-[13px] text-ink">
              {periodComparison.current === null
                ? 'Too early to compare with your other periods.'
                : <>
                    {stats.isClosed ? 'Better than ' : 'On pace to beat '}
                    <span className="font-medium">{periodComparison.beaten} of your other {periodComparison.others}</span>
                    {' '}period{periodComparison.others !== 1 ? 's' : ''}
                  </>}
            </p>
            <p className="text-[11.5px] text-muted-ink mt-0.5">Ranked by income left unspent</p>
            {periodComparison.current !== null && (
              <PeriodRange
                worst={periodComparison.worst.unspent}
                best={periodComparison.best.unspent}
                average={periodComparison.average}
                current={periodComparison.current}
                currentLabel={stats.isClosed ? 'This period' : 'This period, projected'}
                worstText={`${periodComparison.worst.label} · ${formatShortCurrency(periodComparison.worst.unspent)}`}
                bestText={`${periodComparison.best.label} · ${formatShortCurrency(periodComparison.best.unspent)}`}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Projection card (Overview) — open periods only: where this period lands if today's pace holds ── */}
      {hasPredictive && stats.projectedSpend !== null && stats.projectedClose !== null && stats.totalDays !== null && (() => {
        const projectedSpend = stats.projectedSpend
        const projectedClose = stats.projectedClose
        const overIncome = projectedSpend > totalIncome
        // One scale for spent-so-far, the projected rest, and income, so the three read against each other.
        const scale = Math.max(totalIncome, projectedSpend)
        const spentPct = (totalExpense / scale) * 100
        const restPct = ((projectedSpend - totalExpense) / scale) * 100
        const incomePct = (totalIncome / scale) * 100
        const daysLeft = stats.daysRemaining ?? 0
        const runway = stats.runwayDays

        return (
          <div className="rounded-[20px] border border-brand-line bg-brand-tint p-4 lg:col-span-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[.14em] text-brand-ink">Projection</p>
              {stats.isEndDateEstimated && (
                <p className="text-[10.5px] text-brand-muted">assuming a {stats.totalDays}-day period, like the last one</p>
              )}
            </div>

            {/* Pace: everyday spending per day against what keeps the period on track */}
            {stats.safeDaily !== null && (
              <div className="mt-3 rounded-[14px] bg-surface/70 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={cn('text-[18px] font-medium tabular-nums leading-none', overSafePace ? 'text-warning' : 'text-ink')}>
                    {formatCurrency(stats.dailyAvg)}<span className="text-[12px] font-normal text-muted-ink"> / day</span>
                  </p>
                  <span className={cn(
                    'text-[11px] font-medium rounded-full px-2 py-[2px] shrink-0',
                    overSafePace ? 'bg-warning/10 text-warning' : 'bg-positive/10 text-positive'
                  )}>
                    {stats.safeDaily <= 0
                      ? 'no safe room left'
                      : overSafePace
                        ? `${Math.round((stats.dailyAvg / stats.safeDaily - 1) * 100)}% over safe pace`
                        : 'within safe pace'}
                  </span>
                </div>
                {stats.safeDaily > 0 && <PaceGauge daily={stats.dailyAvg} safe={stats.safeDaily} />}
                <p className="mt-1.5 text-[11px] text-muted-ink">
                  Day {Math.min(stats.daysElapsed, stats.totalDays)} of {stats.totalDays} · {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                </p>
              </div>
            )}

            <p className="text-[12.5px] text-brand-ink mt-3">
              If you keep spending <span className="font-semibold text-ink">{formatCurrency(stats.dailyAvg)}/day</span> on everyday things
              {stats.oneOffSpending > 0 ? <> (the {formatCurrency(stats.oneOffSpending)} in bills &amp; one-offs so far counts once{totalSavings > 0 ? ', savings not counted' : ''})</> : totalSavings > 0 ? ' (savings not counted)' : ''}:
            </p>

            {/* Spent so far → projected rest, against this period's income */}
            <div className="relative mt-4 h-2.5 rounded-full bg-surface/80">
              <div className="absolute inset-y-0 left-0 flex overflow-hidden rounded-full" style={{ width: `${spentPct + restPct}%` }}>
                <div className="h-full bg-brand-ink" style={{ width: `${(spentPct / (spentPct + restPct || 1)) * 100}%` }} />
                <div
                  className={cn('h-full flex-1', overIncome ? 'bg-negative/45' : 'bg-brand-ink/35')}
                />
              </div>
              {overIncome && (
                <div
                  className="absolute -top-1 -bottom-1 w-[2px] -translate-x-1/2 rounded-full bg-ink"
                  style={{ left: `${incomePct}%` }}
                  title="Income"
                />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-brand-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-ink" /> {totalSavings > 0 ? 'Spent + saved' : 'Spent'} {formatCurrency(totalExpense)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', overIncome ? 'bg-negative/45' : 'bg-brand-ink/35')} />
                Still to come ~{formatCurrency(projectedSpend - totalExpense)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                {overIncome ? <span className="h-2.5 w-[2px] rounded-full bg-ink" /> : <span className="h-2 w-2 rounded-full border border-brand-line bg-surface" />}
                Income {formatCurrency(totalIncome)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-[14px] border border-brand-line bg-brand-line">
              <div className="bg-brand-tint p-3">
                <p className="text-[11px] text-brand-muted">You'll spend about</p>
                <p className={cn('text-[17px] font-medium mt-1 tabular-nums', overIncome ? 'text-negative' : 'text-ink')}>
                  {formatCurrency(projectedSpend)}
                </p>
                <p className="text-[10.5px] text-brand-muted mt-1">
                  {totalSavings > 0 ? `in total, incl. ${formatCurrency(totalSavings)} saved` : 'in total this period'}
                </p>
              </div>
              <div className="bg-brand-tint p-3">
                <p className="text-[11px] text-brand-muted">You'll end with</p>
                <p className={cn('text-[17px] font-medium mt-1 tabular-nums', projectedClose < 0 ? 'text-negative' : 'text-positive')}>
                  {projectedClose >= 0 ? '' : '−'}{formatCurrency(Math.abs(projectedClose))}
                </p>
                <p className="text-[10.5px] text-brand-muted mt-1">
                  {projectedClose >= 0 ? "of this period's income left over" : 'more than this period\'s income'}
                </p>
              </div>
              <div className="bg-brand-tint p-3">
                <p className="text-[11px] text-brand-muted">Money lasts</p>
                <p className={cn('text-[17px] font-medium mt-1 tabular-nums', runway !== null && runway < daysLeft ? 'text-negative' : 'text-ink')}>
                  {runway === null ? '—' : runway <= 0 ? 'Already out' : `${runway} day${runway !== 1 ? 's' : ''}`}
                </p>
                <p className="text-[10.5px] text-brand-muted mt-1">
                  {runway === null
                    ? 'no spending yet'
                    : runway >= daysLeft
                      ? `past the period end (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`
                      : `runs out ${daysLeft - runway} day${daysLeft - runway !== 1 ? 's' : ''} before the period ends`}
                </p>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
    </>
  )
}
