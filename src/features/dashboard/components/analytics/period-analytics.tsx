import { useState, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import TrendingUp from '~icons/ph/trend-up-duotone'
import TrendingDown from '~icons/ph/trend-down-duotone'
import PiggyBankIcon from '~icons/ph/piggy-bank-duotone'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency, formatShortCurrency, formatDateShort } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { BottomDrawer } from '@/components/bottom-drawer'
import { AccountTypeTile } from '@/components/account-type-icon'
import { CategoryTile } from '@/features/categories/components/category-icon'
import { categoryChartColor } from '@/features/categories/lib/category-colors'
import { calculateHealthScore } from '@/lib/calculate-health-score'
import type { PeriodSummary } from '@/lib/period-summary'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { useBudgets } from '@/queries'
import { usePeriodTrend } from '../../hooks/use-period-trend'
import { PeriodTrendChart } from './period-trend-chart'
import { groupExpensesByCategory, UNCATEGORIZED_ID, type CategoryTotal } from '../../lib/group-expenses-by-category'
import { groupExpensesByWeekday } from '../../lib/group-expenses-by-weekday'
import { CategoryDonutChart } from './category-donut-chart'
import { KindSplitCard } from './kind-split-card'
import { withSavingsMoves } from '@/lib/savings-moves'
import type { ElementType, ReactNode, SVGProps } from 'react'
import type { PayPeriod, TransactionWithDetails } from '@/types'

interface DayEntry {
  date: string
  total: number
  txs: TransactionWithDetails[]
}

type CatEntry = CategoryTotal

interface PeriodAnalyticsProps {
  transactions: TransactionWithDetails[]
  period: PayPeriod
  periods: PayPeriod[]
  previousSummary: PeriodSummary | null
  totalBalance: number
  totalDebt: number
  /** Length of the previous period, used to estimate an open period's end. */
  fallbackTotalDays?: number | null
}

interface StatCellProps {
  label: string
  value: string
  sub?: ReactNode
  valueClassName?: string
  onTap?: () => void
  /** A small data visual under the value (progress, split, …) — carries meaning an icon can't. */
  visual?: ReactNode
}

// One cell of a hairline-divided stat grid: typography does the work, no icon.
function StatCell({ label, value, sub, valueClassName, onTap, visual, className }: StatCellProps & { className?: string }) {
  return (
    <div
      className={cn('bg-surface p-3 min-w-0', onTap && 'cursor-pointer hover:bg-surface-soft active:bg-surface-hover transition-colors', className)}
      onClick={onTap}
    >
      <div className="flex items-center gap-1">
        <p className="text-[11px] text-muted-ink truncate">{label}</p>
        {onTap && <ChevronRight className="w-3 h-3 text-faint-ink shrink-0" />}
      </div>
      <p className={cn('text-[15px] sm:text-[17px] font-medium tracking-[-0.01em] text-ink mt-1 truncate tabular-nums', valueClassName)}>
        {value}
      </p>
      {visual && <div className="mt-2">{visual}</div>}
      {sub && <p className="text-[10.5px] text-subtle-ink mt-1 truncate">{sub}</p>}
    </div>
  )
}

/** Hairline-divided grid: 1px gaps over a line-colored background read as dividers. */
function StatGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('grid gap-px overflow-hidden rounded-[14px] border border-line-soft bg-line-soft', className)}>
      {children}
    </div>
  )
}

interface MeterProps {
  /** 0–1 */
  value: number
  color: string
}

function Meter({ value, color }: MeterProps) {
  return (
    <div className="h-1 rounded-full bg-line-soft overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: color }}
      />
    </div>
  )
}

interface SplitBarProps {
  left: number
  right: number
  leftColor: string
  rightColor: string
}

function SplitBar({ left, right, leftColor, rightColor }: SplitBarProps) {
  const total = left + right
  if (total === 0) return <div className="h-1 rounded-full bg-line-soft" />
  return (
    <div className="flex h-1 gap-[2px] overflow-hidden rounded-full">
      {left > 0 && <div className="h-full" style={{ flexGrow: left, backgroundColor: leftColor }} />}
      {right > 0 && <div className="h-full" style={{ flexGrow: right, backgroundColor: rightColor }} />}
    </div>
  )
}

interface PeriodRangeProps {
  worst: number
  best: number
  average: number
  current: number
}

// Where the average and this period sit between the worst and best period nets.
function PeriodRange({ worst, best, average, current }: PeriodRangeProps) {
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
          This period
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-subtle-ink">
        <span>Worst</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-[2px] rounded-full bg-muted-ink" /> Average
        </span>
        <span>Best</span>
      </div>
    </div>
  )
}

interface SummaryTileProps {
  /** A duotone icon on a tinted plate, like a category tile. */
  icon: ElementType<SVGProps<SVGSVGElement>>
  /** The plate's tint and the icon's color, e.g. 'bg-positive/10 text-positive'. */
  tone: string
  label: string
  value: string
  valueClassName?: string
  diff?: ReactNode
}

function SummaryTile({ icon: Icon, tone, label, value, valueClassName, diff }: SummaryTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-line-soft bg-surface-soft p-3">
      <span className={cn('h-10 w-10 shrink-0 rounded-[12px] flex items-center justify-center', tone)}>
        <Icon className="h-[22px] w-[22px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-ink leading-none">{label}</p>
        <p className={cn('text-[15px] font-medium text-ink mt-1 truncate', valueClassName)}>
          {value}
        </p>
      </div>
      {diff && (
        <div className="shrink-0 text-right">
          {diff}
          <p className="text-[10px] text-subtle-ink mt-0.5">vs last</p>
        </div>
      )}
    </div>
  )
}

interface DiffValueProps {
  pct: number | null
  goodWhenUp: boolean
  className?: string
}

function DiffValue({ pct, goodWhenUp, className }: DiffValueProps) {
  if (pct === null) {
    return <span className={cn('text-[13px] font-medium text-subtle-ink', className)}>—</span>
  }
  const isUp = pct > 0
  const isGood = pct === 0 ? true : isUp === goodWhenUp
  const color = isGood ? 'var(--positive)' : 'var(--negative)'
  const Icon = isUp ? TrendingUp : TrendingDown

  return (
    <span className={cn('inline-flex items-center gap-1 text-[13px] font-medium', className)} style={{ color }}>
      {pct !== 0 && <Icon className="w-[13px] h-[13px]" />}
      {isUp ? '+' : ''}{pct}%
    </span>
  )
}

interface DaySheetProps {
  date: string
  transactions: TransactionWithDetails[]
  onClose: () => void
}

function DaySheet({ date, transactions, onClose }: DaySheetProps) {
  const total = transactions.reduce((s, t) => s + t.amount, 0)

  return (
    <BottomDrawer open onClose={onClose} title={formatDateShort(date)}>
      <p className="text-[22px] font-medium leading-tight -mt-1 mb-3 text-ink">
        {formatCurrency(total)}
      </p>

      <div className="-mx-5 max-h-72 overflow-y-auto divide-y divide-line-soft">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between px-5 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CategoryTile category={tx.category} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">
                  {tx.note ?? tx.category?.name ?? 'Expense'}
                </p>
                {tx.category && tx.note && (
                  <p className="text-[11px] text-subtle-ink truncate">{tx.category.name}</p>
                )}
              </div>
            </div>
            <p className="text-[13px] font-medium text-ink tabular-nums shrink-0 pl-3">{formatCurrency(tx.amount)}</p>
          </div>
        ))}
      </div>
    </BottomDrawer>
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

export function PeriodAnalytics({ transactions, period, periods, previousSummary, totalBalance, totalDebt, fallbackTotalDays = null }: PeriodAnalyticsProps) {
  const [biggestDayOpen, setBiggestDayOpen] = useState(false)
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

  const net = totalIncome - totalExpense

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

  // Biggest day / biggest expense look across the period's spending (savings aren't a splurge).
  const biggestDayEntry = useMemo<DayEntry | null>(() => {
    const map = new Map<string, TransactionWithDetails[]>()
    for (const tx of spending) {
      const arr = map.get(tx.date) ?? []
      arr.push(tx)
      map.set(tx.date, arr)
    }
    return Array.from(map.entries()).reduce<DayEntry | null>((best, [date, txs]) => {
      const total = txs.reduce((s, t) => s + t.amount, 0)
      return !best || total > best.total ? { date, total, txs } : best
    }, null)
  }, [spending])

  const biggestExpense = useMemo(
    () => spending.reduce<TransactionWithDetails | null>(
      (mx, tx) => (!mx || tx.amount > mx.amount ? tx : mx), null
    ),
    [spending]
  )

  // ─── Period stats — delegated to the shared hook ───────────────────────────

  const statsTransactions = useMemo(
    () => [...incomes, ...expenses],
    [incomes, expenses]
  )

  const stats = usePeriodStats({ period, transactions: statsTransactions, fallbackTotalDays })
  const hasPredictive = !stats.isClosed && stats.totalIncome > 0 && stats.projectedSpend !== null
  const overSafePace = stats.safeDaily !== null && stats.dailyAvg > stats.safeDaily
  const showDaysLeft = stats.daysRemaining !== null && !stats.isClosed
  const paceCount = 1 + (stats.safeDaily !== null ? 1 : 0) + (showDaysLeft ? 1 : 0)

  // ─── Multi-period trend ─────────────────────────────────────────────────────

  const { trend } = usePeriodTrend(periods, period, transactions)

  // ─── Desktop-only breakdowns (spending by account, by day of week, period comparison) ──

  const byAccount = useMemo(() => {
    const map = new Map<string, { name: string; type: string; is_savings: boolean; amount: number }>()
    for (const tx of spending) {
      const entry = map.get(tx.account.id) ?? { name: tx.account.name, type: tx.account.type, is_savings: tx.account.is_savings, amount: 0 }
      entry.amount += tx.amount
      map.set(tx.account.id, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
  }, [spending])

  const byWeekday = useMemo(() => groupExpensesByWeekday(spending), [spending])

  const periodComparison = useMemo(() => {
    if (trend.length < 2) return null
    // Ranked by unspent, so a period that moved money into savings isn't marked down for it.
    const best = trend.reduce((mx, t) => t.unspent > mx.unspent ? t : mx, trend[0])
    const worst = trend.reduce((mn, t) => t.unspent < mn.unspent ? t : mn, trend[0])
    const average = trend.reduce((s, t) => s + t.unspent, 0) / trend.length
    return { best, worst, average }
  }, [trend])

  // ─── Savings rate, trend vs previous period, and health score ──────────────

  // Share of income not spent: what's left plus what went into savings.
  const unspent = totalIncome - totalSpending
  const savingsRate = totalIncome > 0 ? (unspent / totalIncome) * 100 : null

  // Spending vs spending — the previous period's savings mustn't count as its spend.
  const expenseDiffPct = useMemo(() => (
    previousSummary && previousSummary.spending > 0
      ? Math.round(((totalSpending - previousSummary.spending) / previousSummary.spending) * 100)
      : null
  ), [previousSummary, totalSpending])

  const incomeDiffPct = useMemo(() => (
    previousSummary && previousSummary.income > 0
      ? Math.round(((totalIncome - previousSummary.income) / previousSummary.income) * 100)
      : null
  ), [previousSummary, totalIncome])

  const unspentDiffAbs = previousSummary ? unspent - previousSummary.unspent : null

  const health = useMemo(() => calculateHealthScore({
    totalIncome,
    totalSpending,
    totalBalance,
    totalDebt,
    expenseDiffPct,
  }), [totalIncome, totalSpending, totalBalance, totalDebt, expenseDiffPct])

  const healthBarColor = health.score >= 80 ? 'var(--positive)' : health.score >= 60 ? 'var(--brand-ink)' : health.score >= 40 ? 'var(--warning)' : 'var(--negative)'

  return (
    <>
    <div className="space-y-2.5 pt-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 lg:items-start">

      {/* ── Financial health card ── */}
      <div className="rounded-[20px] border border-line bg-surface p-4 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Financial health</p>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
            style={{ backgroundColor: `color-mix(in srgb, ${healthBarColor} 12%, transparent)`, color: healthBarColor }}
          >
            <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: healthBarColor }} />
            {health.label}
          </span>
        </div>
        <p
          className="text-[44px] font-medium leading-none tracking-[-.03em] tabular-nums mb-3"
          style={{ color: healthBarColor }}
        >
          {health.score}
        </p>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${health.score}%`, backgroundColor: healthBarColor }}
          />
        </div>
        {(health.periodReasons.length > 0 || health.overallReasons.length > 0) && (
          <div className="mt-2.5 space-y-1">
            {health.periodReasons.length > 0 && (
              <p className="text-[11.5px] text-muted-ink">
                <span className="text-subtle-ink">This period:</span> {health.periodReasons.join(' · ')}
              </p>
            )}
            {health.overallReasons.length > 0 && (
              <p className="text-[11.5px] text-muted-ink">
                <span className="text-subtle-ink">Overall:</span> {health.overallReasons.join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Period summary card (Overview) — net + vs last period, so the comparison has context ── */}
      <div className="rounded-[20px] border border-line bg-surface p-4 lg:col-span-2">
        <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink mb-1.5">Period summary</p>

        {/* Net: the plain headline — the income/expense badges below are what it's made of */}
        <p className={cn(
          'text-[32px] lg:text-[28px] font-medium tracking-[-0.02em] leading-none truncate',
          net < 0 ? 'text-negative' : 'text-ink'
        )}>
          {net >= 0 ? '+' : ''}{formatCurrency(net)}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[11.5px]">
          {savingsRate !== null && (
            <span className={savingsRate < 0 ? 'text-negative' : 'text-positive'}>
              {savingsRate >= 0
                ? `${Math.round(savingsRate)}% of income unspent`
                : `Overspent by ${Math.abs(Math.round(savingsRate))}% of income`}
            </span>
          )}
          {unspentDiffAbs !== null && (
            <span className="text-subtle-ink">
              <span className={unspentDiffAbs < 0 ? 'text-negative' : 'text-positive'}>
                {unspentDiffAbs >= 0 ? '+' : ''}{formatCurrency(unspentDiffAbs)}
              </span>
              {' '}unspent vs last period
            </span>
          )}
        </div>

        {/* Income / expense (/ saved): the icon plates carry the color, so the tiles stay neutral */}
        <div className={cn(
          'grid grid-cols-1 gap-2 border-t border-line-soft pt-3 mt-4',
          totalSavings > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        )}>
          <SummaryTile
            icon={TrendingUp}
            tone="bg-positive/10 text-positive"
            label="Income"
            value={formatCurrency(totalIncome)}
            valueClassName="text-positive"
            diff={previousSummary ? <DiffValue pct={incomeDiffPct} goodWhenUp className="text-[11px]" /> : null}
          />
          <SummaryTile
            icon={TrendingDown}
            tone="bg-negative/10 text-negative"
            label={totalSavings > 0 ? 'Spent' : 'Expense'}
            value={formatCurrency(totalSpending)}
            valueClassName="text-negative"
            diff={previousSummary ? <DiffValue pct={expenseDiffPct} goodWhenUp={false} className="text-[11px]" /> : null}
          />
          {totalSavings > 0 && (
            <SummaryTile
              icon={PiggyBankIcon}
              tone="bg-info/10 text-info"
              label="To savings"
              value={formatCurrency(totalSavings)}
              valueClassName="text-info"
            />
          )}
        </div>
      </div>

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
      </div>

      {/* ── Stats card (Overview) — this period's stats, plus how it stacks up against past periods ── */}
      <div className="rounded-[20px] border border-line bg-surface p-4 lg:col-span-2">
        <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink mb-3">Stats</p>

        {/* Pace: how fast money is going vs how fast it safely can */}
        <p className="text-[10.5px] font-medium text-subtle-ink mb-1.5">Pace</p>
        <StatGrid className={paceCount === 3 ? 'grid-cols-2 sm:grid-cols-3' : paceCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}>
          <StatCell
            label="Daily average"
            value={formatCurrency(stats.dailyAvg)}
            valueClassName={overSafePace ? 'text-warning' : undefined}
            sub={
              <>
                everyday, over {stats.daysElapsed} day{stats.daysElapsed !== 1 ? 's' : ''}
                {stats.safeDaily !== null && (
                  <span className={overSafePace ? 'text-warning' : 'text-positive'}>
                    {' · '}{overSafePace ? 'above safe pace' : 'within safe pace'}
                  </span>
                )}
              </>
            }
          />

          {stats.safeDaily !== null && (
            <StatCell
              label="Safe per day"
              value={formatCurrency(stats.safeDaily)}
              sub="to stay on track"
            />
          )}

          {showDaysLeft && (
            <StatCell
              label="Days left"
              value={`${stats.daysRemaining}`}
              className={paceCount === 3 ? 'col-span-2 sm:col-span-1' : undefined}
              visual={stats.totalDays ? <Meter value={stats.daysElapsed / stats.totalDays} color="var(--brand-ink)" /> : undefined}
              sub={stats.totalDays !== null ? `day ${Math.min(stats.daysElapsed, stats.totalDays)} of ${stats.totalDays}` : undefined}
            />
          )}
        </StatGrid>

        {/* Highlights: the standout moments of the period */}
        <p className="text-[10.5px] font-medium text-subtle-ink mt-4 mb-1.5">Highlights</p>
        <StatGrid className={cn('grid-cols-2', biggestDayEntry ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
          {biggestDayEntry && (
            <StatCell
              label="Biggest day"
              value={formatCurrency(biggestDayEntry.total)}
              sub={formatDateShort(biggestDayEntry.date)}
              onTap={() => setBiggestDayOpen(true)}
            />
          )}

          <StatCell
            label="Biggest expense"
            value={biggestExpense ? formatCurrency(biggestExpense.amount) : '—'}
            sub={biggestExpense?.note ?? biggestExpense?.category?.name}
          />

          <StatCell
            label="Transactions"
            value={`${expenses.length + incomes.length}`}
            visual={<SplitBar left={expenses.length} right={incomes.length} leftColor="var(--negative)" rightColor="var(--positive)" />}
            sub={
              <>
                <span className="text-negative">{expenses.length} out</span>
                {' · '}
                <span className="text-positive">{incomes.length} in</span>
              </>
            }
          />

          <StatCell
            label="No-spend days"
            value={`${stats.noSpendDays}`}
            className={!biggestDayEntry ? 'col-span-2 lg:col-span-1' : undefined}
            visual={<Meter value={stats.noSpendDays / stats.daysElapsed} color="#6366f1" />}
            sub={`of ${stats.daysElapsed} day${stats.daysElapsed !== 1 ? 's' : ''}${stats.isClosed ? '' : ' so far'}`}
          />
        </StatGrid>

        {periodComparison && (
          <div className="mt-4 pt-3 border-t border-line-soft">
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink mb-2">Across your periods</p>
            <StatGrid className="grid-cols-3">
              <StatCell
                label="Best period"
                value={formatCurrency(periodComparison.best.unspent)}
                sub={periodComparison.best.label}
                valueClassName="text-positive"
              />
              <StatCell
                label="Worst period"
                value={formatCurrency(periodComparison.worst.unspent)}
                sub={periodComparison.worst.label}
                valueClassName={periodComparison.worst.unspent < 0 ? 'text-negative' : undefined}
              />
              <StatCell
                label="Average unspent"
                value={formatCurrency(periodComparison.average)}
                sub={`across ${trend.length} periods`}
                valueClassName={periodComparison.average < 0 ? 'text-negative' : undefined}
              />
            </StatGrid>
            <PeriodRange
              worst={periodComparison.worst.unspent}
              best={periodComparison.best.unspent}
              average={periodComparison.average}
              current={unspent}
            />
          </div>
        )}
      </div>

      {/* ── Spending by account (Trends, desktop only) ── */}
      {byAccount.length > 0 && (
        <div className="hidden lg:block rounded-[20px] border border-line bg-surface overflow-hidden">
          <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink px-4 pt-4">
            Spending by account
          </p>
          <p className="text-[11px] text-subtle-ink px-4 pb-3">% of this period's spending (savings excluded)</p>
          {byAccount.map(a => {
            const pct = totalSpending > 0 ? Math.round((a.amount / totalSpending) * 100) : 0
            return (
              <div key={a.name} className="flex items-center gap-3 px-4 py-[9px] border-b border-line-soft last:border-b-0">
                <AccountTypeTile type={a.type} savings={a.is_savings} className="w-8 h-8" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] text-ink truncate">{a.name}</p>
                    <p className="text-[13px] font-medium text-ink">{formatCurrency(a.amount)}</p>
                  </div>
                  <div className="h-1 rounded-full bg-line-soft overflow-hidden">
                    <div className="h-full rounded-full bg-[#94a3b8]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── By day of week (Trends, desktop only) ── */}
      {byWeekday.some(d => d.total > 0) && (
        <div className="hidden lg:block rounded-[20px] border border-line bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">By day of week</p>
          <p className="text-[11px] text-subtle-ink mb-3">Total expense per weekday, this period</p>
          <div style={{ width: '100%', height: 140 }}>
            <ResponsiveContainer>
              <BarChart data={byWeekday} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: '#a3a3a3' }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#a3a3a3' }}
                  tickFormatter={(v: number) => formatShortCurrency(v)}
                  width={36}
                />
                <Tooltip
                  cursor={{ fill: 'var(--surface-hover)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload as { day: string; total: number }
                    return (
                      <div className="rounded-[10px] border border-line bg-surface px-2.5 py-1.5 shadow-lg">
                        <p className="text-[10.5px] text-muted-ink">{d.day}</p>
                        <p className="text-[12px] font-medium text-ink">{formatCurrency(d.total)}</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="total" radius={[3, 3, 0, 0]} fill="var(--brand-ink)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
            <p className="text-[12.5px] text-brand-ink mt-1.5">
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

      {biggestDayOpen && biggestDayEntry && (
        <DaySheet
          date={biggestDayEntry.date}
          transactions={biggestDayEntry.txs}
          onClose={() => setBiggestDayOpen(false)}
        />
      )}
    </>
  )
}
