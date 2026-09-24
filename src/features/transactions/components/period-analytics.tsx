import { useState, useMemo, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, CalendarDays, Flame,
  Receipt, ArrowLeftRight, Moon, Wallet, ChevronRight, type LucideProps,
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency, formatDateShort, getDaysBetween, toISODate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { BottomDrawer } from '@/components/bottom-drawer'
import { calculateHealthScore } from '@/lib/calculate-health-score'
import { usePeriodStats } from '@/hooks/use-period-stats'
import { CategoryIcon } from '@/features/categories/components/category-icon'
import { categoryBudgetsService } from '@/services/budgets.service'
import { usePeriodTrend } from '../hooks/use-period-trend'
import { PeriodTrendChart } from './period-trend-chart'
import type { ElementType } from 'react'
import type { PayPeriod, TransactionWithDetails } from '@/types'

interface DayEntry {
  date: string
  total: number
  txs: TransactionWithDetails[]
}

interface CatEntry {
  id: string
  name: string
  color: string | null
  icon?: string | null
  amount: number
}

interface PeriodAnalyticsProps {
  transactions: TransactionWithDetails[]
  period: PayPeriod
  periods: PayPeriod[]
  previousSummary: { income: number; expense: number; net: number } | null
  totalBalance: number
  totalDebt: number
}

interface StatTileProps {
  icon: ElementType<LucideProps>
  label: string
  value: string
  sub?: string
  valueClassName?: string
  onTap?: () => void
}

function StatTile({ icon: Icon, label, value, sub, valueClassName, onTap }: StatTileProps) {
  return (
    <div
      className={cn(
        'rounded-[12px] border border-[#f0f0ee] bg-[#fbfbfa] p-3',
        onTap && 'cursor-pointer active:bg-[#f4f4f2] transition-colors'
      )}
      onClick={onTap}
    >
      <Icon className="h-[15px] w-[15px] text-[#a3a3a3]" />
      <p className="text-[10.5px] text-[#8a8a84] mt-1.5">{label}</p>
      <p className={cn('text-[15px] font-medium text-[#252525] mt-1', valueClassName)}>
        {value}
      </p>
      {sub && <p className="text-[10.5px] text-[#a3a3a3] mt-0.5">{sub}</p>}
    </div>
  )
}

interface DiffValueProps {
  pct: number | null
  goodWhenUp: boolean
}

function DiffValue({ pct, goodWhenUp }: DiffValueProps) {
  if (pct === null) {
    return <span className="text-[13px] font-medium text-[#a3a3a3]">—</span>
  }
  const isUp = pct > 0
  const isGood = pct === 0 ? true : isUp === goodWhenUp
  const color = isGood ? '#059669' : '#dc2626'
  const Icon = isUp ? TrendingUp : TrendingDown

  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-medium" style={{ color }}>
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
      <p className="text-[22px] font-medium leading-tight -mt-1 mb-3 text-[#252525]">
        {formatCurrency(total)}
      </p>

      <div className="-mx-5 max-h-72 overflow-y-auto divide-y divide-[#f2f2f0]">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between px-5 py-3"
          >
            <div className="flex items-center gap-3">
              {tx.category?.color && (
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tx.category.color }}
                />
              )}
              <div>
                <p className="text-[13px] font-medium text-[#252525]">
                  {tx.note ?? tx.category?.name ?? 'Expense'}
                </p>
                {tx.category && tx.note && (
                  <p className="text-[11px] text-[#a3a3a3]">{tx.category.name}</p>
                )}
              </div>
            </div>
            <p className="text-[13px] font-medium text-[#252525]">{formatCurrency(tx.amount)}</p>
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
    <div className="px-4 pb-3 -mt-1 bg-[#fbfbfa]">
      <div className="rounded-[12px] border border-[#f0f0ee] bg-white overflow-hidden divide-y divide-[#f2f2f0]">
        {sorted.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {tx.category?.color && (
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tx.category.color }}
                />
              )}
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-[#252525] truncate">
                  {tx.note ?? tx.category?.name ?? 'Expense'}
                </p>
                <p className="text-[10.5px] text-[#a3a3a3]">
                  {formatDateShort(tx.date)}
                  {tx.category && tx.note ? ` · ${tx.category.name}` : ''}
                </p>
              </div>
            </div>
            <p className="text-[12.5px] font-medium text-[#252525] shrink-0 pl-2">{formatCurrency(tx.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SparkTooltip({ active, payload }: {
  active?: boolean
  payload?: { payload: { date: string; total: number } }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-[10px] border border-[#e5e5e5] bg-white px-2.5 py-1.5 shadow-lg">
      <p className="text-[10.5px] text-[#8a8a84]">{formatDateShort(d.date)}</p>
      <p className="text-[12px] font-medium text-[#252525]">{formatCurrency(d.total)}</p>
    </div>
  )
}

// Budget progress color: green while comfortably under, amber approaching, red over.
function budgetColor(ratio: number): string {
  if (ratio >= 1) return '#dc2626'
  if (ratio >= 0.7) return '#d97706'
  return '#4d7a1d'
}

type AnalyticsSubTab = 'overview' | 'trends' | 'categories'

const ANALYTICS_SUB_TABS: { key: AnalyticsSubTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'trends', label: 'Trends' },
  { key: 'categories', label: 'Categories' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function PeriodAnalytics({ transactions, period, periods, previousSummary, totalBalance, totalDebt }: PeriodAnalyticsProps) {
  const [biggestDayOpen, setBiggestDayOpen] = useState(false)
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('overview')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)

  useEffect(() => {
    categoryBudgetsService.getAll().then(({ data }) => {
      if (!data) return
      const map: Record<string, number> = {}
      for (const b of data) map[b.category_id] = b.amount
      setBudgets(map)
    })
  }, [])

  const expenses = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions])
  const incomes  = useMemo(() => transactions.filter(t => t.type === 'income'),  [transactions])

  const totalIncome  = useMemo(() => incomes.reduce((s, t) => s + t.amount, 0), [incomes])
  const totalExpense = useMemo(() => expenses.reduce((s, t) => s + t.amount, 0), [expenses])

  const net = totalIncome - totalExpense

  const categoriesByAmount = useMemo<CatEntry[]>(() => {
    const map = new Map<string, CatEntry>()
    for (const tx of expenses) {
      if (!tx.category) continue
      const ex = map.get(tx.category.id)
      if (ex) {
        ex.amount += tx.amount
      } else {
        map.set(tx.category.id, {
          id:     tx.category.id,
          name:   tx.category.name,
          color:  tx.category.color,
          icon:   tx.category.icon,
          amount: tx.amount,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
  }, [expenses])

  const expensesByCategoryId = useMemo(() => {
    const map = new Map<string, TransactionWithDetails[]>()
    for (const tx of expenses) {
      if (!tx.category) continue
      const arr = map.get(tx.category.id) ?? []
      arr.push(tx)
      map.set(tx.category.id, arr)
    }
    return map
  }, [expenses])

  // Tapping a category row expands it in place to the transactions behind its total —
  // "Others" spans whichever categories didn't make the top 5.
  function categoryTransactions(cat: CatEntry): TransactionWithDetails[] {
    if (cat.id === '__others__') {
      const otherIds = new Set(categoriesByAmount.slice(5).map(c => c.id))
      return expenses.filter(tx => tx.category && otherIds.has(tx.category.id))
    }
    return expensesByCategoryId.get(cat.id) ?? []
  }

  const hiddenCategoriesCount = Math.max(0, categoriesByAmount.length - 5)

  // Capped to top 5 + an "Others" bucket by default; `showAllCategories` breaks the bucket open.
  const allCategories = useMemo<CatEntry[]>(() => {
    if (showAllCategories || hiddenCategoriesCount === 0) return categoriesByAmount
    const top5 = categoriesByAmount.slice(0, 5)
    const rest = categoriesByAmount.slice(5)
    return [...top5, {
      id:     '__others__',
      name:   `Others (${rest.length})`,
      color:  '#d4d4d4',
      amount: rest.reduce((s, c) => s + c.amount, 0),
    }]
  }, [categoriesByAmount, showAllCategories, hiddenCategoriesCount])

  // Categories at/near their target float to the top — the first thing you see
  // is what's about to blow its budget. Un-targeted categories come next, Others last.
  const sortedCategories = useMemo(() => {
    const real = allCategories.filter(c => c.id !== '__others__')
    const others = allCategories.find(c => c.id === '__others__')
    const budgeted = real
      .filter(c => budgets[c.id] !== undefined)
      .sort((a, b) => (b.amount / budgets[b.id]) - (a.amount / budgets[a.id]))
    const unbudgeted = real.filter(c => budgets[c.id] === undefined)
    return [...budgeted, ...unbudgeted, ...(others ? [others] : [])]
  }, [allCategories, budgets])

  // Biggest day / biggest expense look across all expenses in the period.
  const biggestDayEntry = useMemo<DayEntry | null>(() => {
    const map = new Map<string, TransactionWithDetails[]>()
    for (const tx of expenses) {
      const arr = map.get(tx.date) ?? []
      arr.push(tx)
      map.set(tx.date, arr)
    }
    return Array.from(map.entries()).reduce<DayEntry | null>((best, [date, txs]) => {
      const total = txs.reduce((s, t) => s + t.amount, 0)
      return !best || total > best.total ? { date, total, txs } : best
    }, null)
  }, [expenses])

  const biggestExpense = useMemo(
    () => expenses.reduce<TransactionWithDetails | null>(
      (mx, tx) => (!mx || tx.amount > mx.amount ? tx : mx), null
    ),
    [expenses]
  )

  // ─── Period stats — delegated to the shared hook ───────────────────────────

  const statsTransactions = useMemo(
    () => [...incomes, ...expenses],
    [incomes, expenses]
  )

  const stats = usePeriodStats({ period, transactions: statsTransactions })
  const hasPredictive = !!period.end_date && stats.totalIncome > 0 && stats.projectedSpend !== null

  // ─── Net-this-period sparkline (daily expense across the elapsed period) ───

  const netSparkline = useMemo(() => {
    const daysElapsed = Math.min(62, Math.max(1, getDaysBetween(period.start_date)))
    const start = new Date(period.start_date + 'T00:00:00')
    const days: { date: string; total: number }[] = []
    for (let i = 0; i < daysElapsed; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      days.push({ date: toISODate(d), total: 0 })
    }
    const byDate = new Map(days.map(d => [d.date, d]))
    for (const tx of expenses) {
      const bucket = byDate.get(toISODate(new Date(tx.date)))
      if (bucket) bucket.total += tx.amount
    }
    return days
  }, [period, expenses])

  // ─── Multi-period trend ─────────────────────────────────────────────────────

  const { trend } = usePeriodTrend(periods, period, transactions)

  // ─── Desktop-only breakdowns (spending by account, by day of week, period comparison) ──

  const byAccount = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of expenses) {
      map.set(tx.account.name, (map.get(tx.account.name) ?? 0) + tx.amount)
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses])

  const byWeekday = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const totals = new Array(7).fill(0) as number[]
    for (const tx of expenses) {
      const jsDay = new Date(tx.date + 'T00:00:00').getDay() // 0 = Sunday
      totals[(jsDay + 6) % 7] += tx.amount
    }
    return labels.map((day, i) => ({ day, total: totals[i] }))
  }, [expenses])

  const periodComparison = useMemo(() => {
    if (trend.length < 2) return null
    const best = trend.reduce((mx, t) => t.net > mx.net ? t : mx, trend[0])
    const worst = trend.reduce((mn, t) => t.net < mn.net ? t : mn, trend[0])
    const average = trend.reduce((s, t) => s + t.net, 0) / trend.length
    return { best, worst, average }
  }, [trend])

  // ─── Savings rate, trend vs previous period, and health score ──────────────

  const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : null

  const expenseDiffPct = useMemo(() => (
    previousSummary && previousSummary.expense > 0
      ? Math.round(((totalExpense - previousSummary.expense) / previousSummary.expense) * 100)
      : null
  ), [previousSummary, totalExpense])

  const incomeDiffPct = useMemo(() => (
    previousSummary && previousSummary.income > 0
      ? Math.round(((totalIncome - previousSummary.income) / previousSummary.income) * 100)
      : null
  ), [previousSummary, totalIncome])

  const netDiffAbs = previousSummary ? net - previousSummary.net : null

  const health = useMemo(() => calculateHealthScore({
    totalIncome,
    totalExpense,
    totalBalance,
    totalDebt,
    expenseDiffPct,
  }), [totalIncome, totalExpense, totalBalance, totalDebt, expenseDiffPct])

  const healthBarColor = health.score >= 80 ? '#059669' : health.score >= 60 ? '#4d7a1d' : health.score >= 40 ? '#d97706' : '#dc2626'

  return (
    <>
      {/* ── Desktop-only sub-tab nav — lets desktop show one short group at a time instead of one long scroll ── */}
      <div className="hidden lg:flex items-center gap-1 rounded-xl bg-[#f4f4f2] p-[3px] mt-3 w-fit">
        {ANALYTICS_SUB_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSubTab(tab.key)}
            className={cn(
              'px-4 py-1.5 text-[12.5px] rounded-[9px] transition-colors duration-150',
              activeSubTab === tab.key
                ? 'bg-white text-[#252525] font-semibold shadow-sm'
                : 'text-[#8a8a84] font-medium'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

    <div className="space-y-2.5 pt-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 lg:items-start">

      {/* ── Financial health card (Overview) ── */}
      <div className={cn('rounded-[20px] border border-[#e5e5e5] bg-white p-4 lg:col-span-2', activeSubTab !== 'overview' && 'lg:hidden')}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Financial health</p>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
            style={{ backgroundColor: `${healthBarColor}1f`, color: healthBarColor }}
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
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[#f2f2f0]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${health.score}%`, backgroundColor: healthBarColor }}
          />
        </div>
        {health.reasons.length > 0 && (
          <p className="text-[11.5px] text-[#8a8a84] mt-2.5">{health.reasons.slice(0, 2).join(' · ')}</p>
        )}
      </div>

      {/* ── Net summary card (Overview) ── */}
      <div className={cn('rounded-[20px] border border-[#e5e5e5] bg-white p-4 lg:col-span-2', activeSubTab !== 'overview' && 'lg:hidden')}>
        <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] mb-1">Net this period</p>
        <p className={cn(
          'text-[32px] lg:text-[26px] font-medium tracking-[-0.02em] leading-none mb-1',
          net < 0 ? 'text-[#dc2626]' : 'text-[#252525]'
        )}>
          {net >= 0 ? '+' : ''}{formatCurrency(net)}
        </p>
        {savingsRate !== null && (
          <p className={cn(
            'text-[11.5px] mb-3',
            savingsRate < 0 ? 'text-[#dc2626]' : 'text-[#059669]'
          )}>
            {savingsRate >= 0
              ? `Saved ${Math.round(savingsRate)}% of income`
              : `Overspent by ${Math.abs(Math.round(savingsRate))}% of income`}
          </p>
        )}

        <div style={{ width: '100%', height: 44 }}>
          <ResponsiveContainer>
            <AreaChart data={netSparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netSparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#252525" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#252525" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<SparkTooltip />} cursor={{ stroke: '#e5e5e5' }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#252525"
                strokeWidth={1.5}
                fill="url(#netSparkFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-0 border-t border-[#f2f2f0] pt-3 mt-3">
          <div className="pr-4 border-r border-[#f2f2f0]">
            <p className="text-[10px] text-[#8a8a84] mb-1">In</p>
            <p className="text-[13px] font-medium text-[#059669]">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="pl-4">
            <p className="text-[10px] text-[#8a8a84] mb-1">Out</p>
            <p className="text-[13px] font-medium text-[#252525]">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      </div>

      {/* ── Spending trend card (Trends) ── */}
      <div className={cn('rounded-[20px] border border-[#e5e5e5] bg-white p-4 lg:col-span-2', activeSubTab !== 'trends' && 'lg:hidden')}>
        <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] mb-3">Spending trend</p>
        <PeriodTrendChart trend={trend} />
      </div>

      {/* ── Across your periods (Overview, desktop only) ── */}
      {periodComparison && (
        <div className={cn('hidden rounded-[20px] border border-[#e5e5e5] bg-white p-4 lg:col-span-2', activeSubTab === 'overview' && 'lg:block')}>
          <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] mb-3">Across your periods</p>
          <div className="grid grid-cols-3 gap-2">
            <StatTile
              icon={TrendingUp}
              label="Best period"
              value={formatCurrency(periodComparison.best.net)}
              sub={periodComparison.best.label}
              valueClassName="text-[#059669]"
            />
            <StatTile
              icon={TrendingDown}
              label="Worst period"
              value={formatCurrency(periodComparison.worst.net)}
              sub={periodComparison.worst.label}
              valueClassName={periodComparison.worst.net < 0 ? 'text-[#dc2626]' : undefined}
            />
            <StatTile
              icon={ArrowLeftRight}
              label="Average net"
              value={formatCurrency(periodComparison.average)}
              sub={`across ${trend.length} periods`}
              valueClassName={periodComparison.average < 0 ? 'text-[#dc2626]' : undefined}
            />
          </div>
        </div>
      )}

      {/* ── Vs last period card (Overview) ── */}
      {previousSummary && (
        <div className={cn('rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden', activeSubTab !== 'overview' && 'lg:hidden')}>
          <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] px-4 pt-4 pb-1">
            Vs last period
          </p>

          <div className="flex items-center justify-between px-4 py-[9px] border-t border-[#f2f2f0]">
            <p className="text-[13px] text-[#252525]">Income</p>
            <DiffValue pct={incomeDiffPct} goodWhenUp />
          </div>

          <div className="flex items-center justify-between px-4 py-[9px] border-t border-[#f2f2f0]">
            <p className="text-[13px] text-[#252525]">Expense</p>
            <DiffValue pct={expenseDiffPct} goodWhenUp={false} />
          </div>

          <div className="flex items-center justify-between px-4 py-[9px] border-t border-[#f2f2f0]">
            <p className="text-[13px] text-[#252525]">Net</p>
            <p className={cn(
              'text-[13px] font-medium',
              netDiffAbs !== null && netDiffAbs < 0 ? 'text-[#dc2626]' : 'text-[#059669]'
            )}>
              {netDiffAbs !== null && netDiffAbs >= 0 ? '+' : ''}
              {netDiffAbs !== null ? formatCurrency(netDiffAbs) : '—'}
            </p>
          </div>
        </div>
      )}

      {/* ── Stats card (Overview) ── */}
      <div className={cn('rounded-[20px] border border-[#e5e5e5] bg-white p-4', activeSubTab !== 'overview' && 'lg:hidden')}>
        <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] mb-3">Stats</p>

        <div className="grid grid-cols-2 gap-2">
          <StatTile
            icon={CalendarDays}
            label="Daily average"
            value={formatCurrency(stats.dailyAvg)}
            sub={`over ${stats.daysElapsed} day${stats.daysElapsed !== 1 ? 's' : ''}`}
          />

          {stats.safeDaily !== null && (
            <StatTile
              icon={Wallet}
              label="Safe per day"
              value={formatCurrency(stats.safeDaily)}
              sub="to stay on track"
            />
          )}

          {stats.daysRemaining !== null && (
            <StatTile
              icon={CalendarDays}
              label="Days left"
              value={`${stats.daysRemaining}`}
              sub={stats.totalDays !== null ? `of ${stats.totalDays}` : undefined}
            />
          )}

          {biggestDayEntry && (
            <StatTile
              icon={Flame}
              label="Biggest day"
              value={formatCurrency(biggestDayEntry.total)}
              sub={formatDateShort(biggestDayEntry.date)}
              onTap={() => setBiggestDayOpen(true)}
            />
          )}

          <StatTile
            icon={Receipt}
            label="Biggest expense"
            value={biggestExpense ? formatCurrency(biggestExpense.amount) : '—'}
            sub={biggestExpense?.note ?? biggestExpense?.category?.name}
          />

          <StatTile
            icon={ArrowLeftRight}
            label="Transactions"
            value={`${expenses.length + incomes.length}`}
            sub={`${expenses.length} out · ${incomes.length} in`}
          />

          <StatTile
            icon={Moon}
            label="No-spend days"
            value={`${stats.noSpendDays}`}
            sub={stats.noSpendDays > 0 ? 'nice' : 'none yet'}
          />
        </div>
      </div>

      {/* ── Spending by account (Trends, desktop only) ── */}
      {byAccount.length > 0 && (
        <div className={cn('hidden rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden', activeSubTab === 'trends' && 'lg:block')}>
          <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] px-4 pt-4 pb-3">
            Spending by account
          </p>
          {byAccount.map(a => {
            const pct = totalExpense > 0 ? Math.round((a.amount / totalExpense) * 100) : 0
            return (
              <div key={a.name} className="px-4 py-[9px] border-b border-[#f2f2f0] last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] text-[#252525]">{a.name}</p>
                  <p className="text-[13px] font-medium text-[#252525]">{formatCurrency(a.amount)}</p>
                </div>
                <div className="h-1 rounded-full bg-[#f2f2f0] overflow-hidden">
                  <div className="h-full rounded-full bg-[#94a3b8]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── By day of week (Trends, desktop only) ── */}
      {byWeekday.some(d => d.total > 0) && (
        <div className={cn('hidden rounded-[20px] border border-[#e5e5e5] bg-white p-4', activeSubTab === 'trends' && 'lg:block')}>
          <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] mb-3">By day of week</p>
          <div style={{ width: '100%', height: 140 }}>
            <ResponsiveContainer>
              <BarChart data={byWeekday} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: '#a3a3a3' }} />
                <Tooltip
                  cursor={{ fill: '#f4f4f2' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload as { day: string; total: number }
                    return (
                      <div className="rounded-[10px] border border-[#e5e5e5] bg-white px-2.5 py-1.5 shadow-lg">
                        <p className="text-[10.5px] text-[#8a8a84]">{d.day}</p>
                        <p className="text-[12px] font-medium text-[#252525]">{formatCurrency(d.total)}</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="total" radius={[3, 3, 0, 0]} fill="#4d7a1d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Budgets card (Categories) ── */}
      {sortedCategories.length > 0 && (
        <div className={cn('rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden lg:col-span-2', activeSubTab !== 'categories' && 'lg:hidden')}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Budgets</p>
            <p className="text-[11px] text-[#a3a3a3]">tap a row for detail</p>
          </div>

          {sortedCategories.map(cat => {
            const isOthers = cat.id === '__others__'
            const isExpanded = expandedCategoryId === cat.id
            const pct = totalExpense > 0
              ? Math.round((cat.amount / totalExpense) * 100)
              : null
            const target = budgets[cat.id]
            const ratio = target ? cat.amount / target : null

            return (
              <div key={cat.id} className="border-b border-[#f2f2f0]">
                <div
                  onClick={() => setExpandedCategoryId(id => id === cat.id ? null : cat.id)}
                  className="px-4 py-3 cursor-pointer hover:bg-[#fbfbfa] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px]"
                        style={{ backgroundColor: `${cat.color ?? '#94a3b8'}1f` }}
                      >
                        <CategoryIcon
                          name={isOthers ? undefined : cat.icon}
                          className="h-[14px] w-[14px]"
                          style={{ color: cat.color ?? '#94a3b8' }}
                        />
                      </div>
                      <p className="text-[13px] text-[#252525] truncate">{cat.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[12px] text-[#a3a3a3] min-w-[28px] text-right">
                        {pct !== null ? `${pct}%` : '—'}
                      </span>
                      <span className="text-[13px] font-medium text-[#252525] min-w-[82px] text-right">
                        {formatCurrency(cat.amount)}
                      </span>
                      <ChevronRight
                        className={cn('w-[13px] h-[13px] text-[#c4c4be] shrink-0 transition-transform', isExpanded && 'rotate-90')}
                      />
                    </div>
                  </div>

                  {!isOthers && target !== undefined && ratio !== null && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#f2f2f0] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.round(ratio * 100))}%`, backgroundColor: budgetColor(ratio) }}
                        />
                      </div>
                      <span className="text-[10.5px] text-[#a3a3a3] shrink-0">
                        {Math.round(ratio * 100)}% of {formatCurrency(target)}
                      </span>
                    </div>
                  )}
                </div>

                {isExpanded && <CategoryTransactionList transactions={categoryTransactions(cat)} />}
              </div>
            )
          })}

          {hiddenCategoriesCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllCategories(v => !v)}
              className="w-full px-4 py-2.5 text-[12px] font-medium text-[#252525] border-b border-[#f2f2f0] hover:bg-[#fbfbfa] transition-colors text-left"
            >
              {showAllCategories ? 'Show less' : `See all categories (${categoriesByAmount.length})`}
            </button>
          )}

          <div className="flex items-center justify-between px-4 py-2.5 bg-[#f4f4f2]">
            <p className="text-[12px] text-[#8a8a84]">Total spent</p>
            <p className="text-[13px] font-medium text-[#252525]">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      )}

      {/* ── Projection card (Overview) — only when the period has an end date and income > 0 ── */}
      {hasPredictive && stats.projectedSpend !== null && stats.projectedClose !== null && (
        <div className={cn('rounded-[20px] border border-[#cfdcb8] bg-[#f2f6ea] overflow-hidden lg:col-span-2', activeSubTab !== 'overview' && 'lg:hidden')}>
          <p className="text-[11px] uppercase tracking-[.14em] text-[#4d7a1d] px-4 pt-4 pb-1">
            Projection
          </p>

          <div className="flex items-center justify-between px-4 py-[9px] border-t border-[#dfe8d2]">
            <p className="text-[13px] text-[#4d7a1d]">Projected spend</p>
            <div className="text-right">
              <p className={cn(
                'text-[13px] font-medium',
                stats.projectedSpend > totalIncome ? 'text-[#dc2626]' : 'text-[#252525]'
              )}>
                {formatCurrency(stats.projectedSpend)}
              </p>
              <p className="text-[10px] text-[#4d7a1d] mt-0.5">if daily avg holds</p>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-[9px] border-t border-[#dfe8d2]">
            <p className="text-[13px] text-[#4d7a1d]">Projected close</p>
            <p className={cn(
              'text-[13px] font-medium',
              stats.projectedClose < 0 ? 'text-[#dc2626]' : 'text-[#252525]'
            )}>
              {formatCurrency(stats.projectedClose)}
            </p>
          </div>

          {stats.runwayDays !== null && (
            <div className="flex items-center justify-between px-4 py-[9px] border-t border-[#dfe8d2]">
              <p className="text-[13px] text-[#4d7a1d]">Runway at this pace</p>
              <p className={cn(
                'text-[13px] font-medium',
                stats.runwayDays <= 0 ? 'text-[#dc2626]' : 'text-[#252525]'
              )}>
                {stats.runwayDays <= 0
                  ? 'Already over'
                  : `${stats.runwayDays} day${stats.runwayDays !== 1 ? 's' : ''}`}
              </p>
            </div>
          )}
        </div>
      )}

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
