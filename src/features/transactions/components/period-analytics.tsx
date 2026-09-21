import { useState, useMemo } from 'react'
import {
  Minus, Plus, TrendingUp, TrendingDown, CalendarDays, Flame,
  Receipt, ArrowLeftRight, Moon, type LucideProps,
} from 'lucide-react'
import { formatCurrency, formatDateShort, getDaysBetween, toISODate, heatBarColor } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { BottomDrawer } from '@/components/bottom-drawer'
import { calculateHealthScore } from '@/lib/calculate-health-score'
import { CategoryIcon } from '@/features/categories/components/category-icon'
import type { ElementType } from 'react'

interface Category {
  id: string
  name: string
  color: string | null
  icon?: string | null
}

interface Transaction {
  id: string
  date: string
  amount: number
  type: 'expense' | 'income'
  note: string | null
  category: Category | null
}

export type TransactionWithDetails = Transaction

export interface PayPeriod {
  start_date: string
  end_date: string | null
}

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

interface PeriodStatsBase {
  days: number
  daysElapsed: number
  daysRemaining: number | null
  dailyAvg: number
  remaining: number
}

type PeriodStats =
  | (PeriodStatsBase & { hasPredictive: false })
  | (PeriodStatsBase & {
      hasPredictive: true
      projectedSpend: number
      projectedRemaining: number
      daysUntilBroke: number | null
    })

interface PeriodAnalyticsProps {
  transactions: TransactionWithDetails[]
  period: PayPeriod
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function PeriodAnalytics({ transactions, period, previousSummary, totalBalance, totalDebt }: PeriodAnalyticsProps) {
  const [skippedCats, setSkippedCats] = useState<Set<string>>(new Set())
  const [biggestDayOpen, setBiggestDayOpen] = useState(false)

  const expenses = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions])
  const incomes  = useMemo(() => transactions.filter(t => t.type === 'income'),  [transactions])

  const totalIncome  = useMemo(() => incomes.reduce((s, t) => s + t.amount, 0), [incomes])
  const totalExpense = useMemo(() => expenses.reduce((s, t) => s + t.amount, 0), [expenses])

  const net = totalIncome - totalExpense

  const allCategories = useMemo<CatEntry[]>(() => {
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
    const sorted = Array.from(map.values()).sort((a, b) => b.amount - a.amount)
    const top5 = sorted.slice(0, 5)
    const rest = sorted.slice(5)
    if (rest.length > 0) {
      top5.push({
        id:     '__others__',
        name:   `Others (${rest.length})`,
        color:  '#d4d4d4',
        amount: rest.reduce((s, c) => s + c.amount, 0),
      })
    }
    return top5
  }, [expenses])

  const activeExpenses = useMemo(
    () => expenses.filter(tx => !tx.category || !skippedCats.has(tx.category.id)),
    [expenses, skippedCats]
  )

  const activeTotal = useMemo(
    () => activeExpenses.reduce((s, t) => s + t.amount, 0),
    [activeExpenses]
  )

  // Biggest day uses ALL expenses (not filtered) — intentional
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
    () => activeExpenses.reduce<TransactionWithDetails | null>(
      (mx, tx) => (!mx || tx.amount > mx.amount ? tx : mx), null
    ),
    [activeExpenses]
  )

  const noSpendDays = useMemo(() => {
    const daysElapsed = Math.max(1, getDaysBetween(period.start_date))
    const spentDates = new Set(activeExpenses.map(tx => tx.date))
    return Math.max(0, daysElapsed - spentDates.size)
  }, [period, activeExpenses])

  // ─── Period stats computation ──────────────────────────────────────────────

  const stats = useMemo<PeriodStats>(() => {
    const daysElapsed = Math.max(1, getDaysBetween(period.start_date))
    const dailyAvg    = daysElapsed > 0 ? activeTotal / daysElapsed : 0
    const remaining   = totalIncome - activeTotal

    if (!period.end_date) {
      return {
        days: daysElapsed,
        daysElapsed,
        daysRemaining: null,
        dailyAvg,
        remaining,
        hasPredictive: false,
      }
    }

    const totalDays     = Math.max(1, getDaysBetween(period.start_date, period.end_date))
    const daysRemaining = Math.max(0, totalDays - daysElapsed)

    if (totalIncome === 0) {
      return {
        days: totalDays,
        daysElapsed,
        daysRemaining,
        dailyAvg,
        remaining,
        hasPredictive: false,
      }
    }

    const projectedSpend     = dailyAvg * totalDays
    const projectedRemaining = totalIncome - projectedSpend
    const daysUntilBroke     = dailyAvg > 0
      ? Math.floor(remaining / dailyAvg)
      : null

    return {
      days: totalDays,
      daysElapsed,
      daysRemaining,
      dailyAvg,
      remaining,
      hasPredictive: true,
      projectedSpend,
      projectedRemaining,
      daysUntilBroke,
    }
  }, [period, activeTotal, totalIncome])

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

  const netSparklineMax = Math.max(0, ...netSparkline.map(d => d.total))

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

  const isFiltered = skippedCats.size > 0

  function toggleCat(id: string) {
    setSkippedCats(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2.5 pt-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 lg:items-start">

      {/* ── Financial health card ── */}
      <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-4 lg:col-span-2">
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
          className="text-[38px] font-medium leading-none tracking-[-.03em] tabular-nums mb-3"
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

      {/* ── Net summary card ── */}
      <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-4 lg:col-span-2">
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

        <div className="flex items-end gap-[2px]" style={{ height: '40px' }}>
          {netSparkline.map((d, i) => {
            const isToday = i === netSparkline.length - 1
            const ratio = netSparklineMax > 0 ? d.total / netSparklineMax : 0
            const height = d.total > 0 ? Math.max(3, Math.round(ratio * 40)) : 2
            return (
              <div
                key={d.date}
                className="flex-1 rounded-[1.5px]"
                style={{
                  height: `${height}px`,
                  backgroundColor: d.total <= 0
                    ? '#f2f2f0'
                    : isToday ? '#252525' : heatBarColor(ratio),
                }}
              />
            )
          })}
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

      {/* ── Vs last period card ── */}
      {previousSummary && (
        <div className="rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden">
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

      {/* ── Where it went card ── */}
      {allCategories.length > 0 && (
        <div className="rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Where it went</p>
            <p className="text-[11px] text-[#a3a3a3]">tap − to exclude</p>
          </div>

          {/* Ribbon */}
          <div className="px-4 pb-3">
            <div className="h-[5px] rounded-full overflow-hidden flex gap-0.5">
              {allCategories.map(cat => {
                const pct = activeTotal > 0 && !skippedCats.has(cat.id)
                  ? (cat.amount / activeTotal) * 100
                  : 0
                return (
                  <div
                    key={cat.id}
                    className="transition-all duration-300"
                    style={{
                      width:           `${pct}%`,
                      backgroundColor: cat.color ?? '#94a3b8',
                      minWidth:        pct > 0 ? 2 : 0,
                    }}
                  />
                )
              })}
              <div className="flex-1 bg-[#f2f2f0]" />
            </div>
          </div>

          {/* Category rows */}
          {allCategories.map(cat => {
            const isOthers = cat.id === '__others__'
            const isSkipped = !isOthers && skippedCats.has(cat.id)
            const pct = activeTotal > 0 && !isSkipped
              ? Math.round((cat.amount / activeTotal) * 100)
              : null

            return (
              <div
                key={cat.id}
                className={cn(
                  'flex items-center justify-between px-4 py-[9px] border-b border-[#f2f2f0] transition-opacity',
                  isSkipped && 'opacity-30'
                )}
              >
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
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#a3a3a3] min-w-[28px] text-right">
                    {pct !== null ? `${pct}%` : '—'}
                  </span>
                  <span className="text-[13px] font-medium text-[#252525] min-w-[82px] text-right">
                    {formatCurrency(cat.amount)}
                  </span>
                  {!isOthers && (
                    <button
                      onClick={() => toggleCat(cat.id)}
                      aria-label={isSkipped ? `Include ${cat.name}` : `Exclude ${cat.name}`}
                      className={cn(
                        'w-[22px] h-[22px] rounded-full border flex items-center justify-center shrink-0 transition-colors text-[#8a8a84]',
                        isSkipped
                          ? 'border-[#e5e5e5] bg-[#f4f4f2]'
                          : 'border-[#e5e5e5] bg-white'
                      )}
                    >
                      {isSkipped
                        ? <Plus className="w-[13px] h-[13px]" />
                        : <Minus className="w-[13px] h-[13px]" />
                      }
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Total row */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#f4f4f2]">
            <div>
              <p className="text-[12px] text-[#8a8a84]">Total spent</p>
              {isFiltered && (
                <p className="text-[10px] text-[#a3a3a3] italic">excl. skipped</p>
              )}
            </div>
            <p className="text-[13px] font-medium text-[#252525]">{formatCurrency(activeTotal)}</p>
          </div>
        </div>
      )}

      {/* ── Stats card ── */}
      <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-4">
        <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] mb-3">
          {isFiltered ? 'Stats (filtered)' : 'Stats'}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <StatTile
            icon={CalendarDays}
            label="Daily average"
            value={formatCurrency(stats.dailyAvg)}
            sub={`over ${stats.daysElapsed} day${stats.daysElapsed !== 1 ? 's' : ''}`}
          />

          {stats.daysRemaining !== null && (
            <StatTile
              icon={CalendarDays}
              label="Days left"
              value={`${stats.daysRemaining}`}
              sub={`of ${stats.days}`}
            />
          )}

          {/* Biggest day uses ALL expenses (not filtered) — intentional, tap to see detail */}
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
            value={`${activeExpenses.length + incomes.length}`}
            sub={`${activeExpenses.length} out · ${incomes.length} in`}
          />

          <StatTile
            icon={Moon}
            label="No-spend days"
            value={`${noSpendDays}`}
            sub={noSpendDays > 0 ? 'nice' : 'none yet'}
          />
        </div>
      </div>

      {/* ── Projection card — only when the period has an end date and income > 0 ── */}
      {stats.hasPredictive && (
        <div className="rounded-[20px] border border-[#cfdcb8] bg-[#f2f6ea] overflow-hidden">
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
              stats.projectedRemaining < 0 ? 'text-[#dc2626]' : 'text-[#252525]'
            )}>
              {formatCurrency(stats.projectedRemaining)}
            </p>
          </div>

          {stats.daysUntilBroke !== null && (
            <div className="flex items-center justify-between px-4 py-[9px] border-t border-[#dfe8d2]">
              <p className="text-[13px] text-[#4d7a1d]">Runway at this pace</p>
              <p className={cn(
                'text-[13px] font-medium',
                stats.daysUntilBroke <= 0 ? 'text-[#dc2626]' : 'text-[#252525]'
              )}>
                {stats.daysUntilBroke <= 0
                  ? 'Already over'
                  : `${stats.daysUntilBroke} day${stats.daysUntilBroke !== 1 ? 's' : ''}`}
              </p>
            </div>
          )}
        </div>
      )}

      {biggestDayOpen && biggestDayEntry && (
        <DaySheet
          date={biggestDayEntry.date}
          transactions={biggestDayEntry.txs}
          onClose={() => setBiggestDayOpen(false)}
        />
      )}
    </div>
  )
}