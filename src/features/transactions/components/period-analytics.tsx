import { useState, useMemo } from 'react'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  color: string | null
}

interface Transaction {
  id: string
  date: string
  amount: number
  type: 'expense' | 'income'
  note: string | null
  category: Category | null
}

export interface TransactionWithDetails extends Transaction {}

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
  amount: number
}

interface PeriodAnalyticsProps {
  transactions: TransactionWithDetails[]
  period: PayPeriod
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDays(period: PayPeriod): number {
  const start = new Date(period.start_date)
  const end = period.end_date ? new Date(period.end_date) : new Date()
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

interface StatRowProps {
  label: string
  value: string
  sub?: string
  onTap?: () => void
  tappable?: boolean
}

function StatRow({ label, value, sub, onTap, tappable }: StatRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-[9px] border-b border-neutral-100',
        tappable && 'cursor-pointer active:bg-neutral-50 transition-colors'
      )}
      onClick={onTap}
    >
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <div className="text-right">
        <p className={cn('text-[13px] font-medium', tappable && 'text-foreground underline decoration-dotted underline-offset-2')}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-2xl border border-neutral-200 pb-safe"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-neutral-200" />
        </div>

        <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-neutral-100">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
              {formatDate(date)}
            </p>
            <p className="text-[22px] font-medium leading-tight mt-0.5">
              {formatCurrency(total)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-muted-foreground"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {transactions.map((tx, i) => (
            <div
              key={tx.id}
              className={cn(
                'flex items-center justify-between px-4 py-3',
                i < transactions.length - 1 && 'border-b border-neutral-100'
              )}
            >
              <div className="flex items-center gap-3">
                {tx.category?.color && (
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tx.category.color }}
                  />
                )}
                <div>
                  <p className="text-[13px] font-medium">
                    {tx.note ?? tx.category?.name ?? 'Expense'}
                  </p>
                  {tx.category && tx.note && (
                    <p className="text-[11px] text-muted-foreground">{tx.category.name}</p>
                  )}
                </div>
              </div>
              <p className="text-[13px] font-medium">{formatCurrency(tx.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PeriodAnalytics({ transactions, period }: PeriodAnalyticsProps) {
  const [skippedCats, setSkippedCats] = useState<Set<string>>(new Set())
  const [biggestDayOpen, setBiggestDayOpen] = useState(false)

  const expenses = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions])
  const incomes  = useMemo(() => transactions.filter(t => t.type === 'income'),  [transactions])

  const totalIncome  = useMemo(() => incomes.reduce((s, t) => s + t.amount, 0), [incomes])
  const totalExpense = useMemo(() => expenses.reduce((s, t) => s + t.amount, 0), [expenses])
  const net          = totalIncome - totalExpense
  const spentPercent = totalIncome > 0
    ? Math.min(Math.round((totalExpense / totalIncome) * 100), 100)
    : 0

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
          amount: tx.amount,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 5)
  }, [expenses])


  const activeExpenses = useMemo(
    () => expenses.filter(tx => !tx.category || !skippedCats.has(tx.category.id)),
    [expenses, skippedCats]
  )

  const activeTotal = useMemo(
    () => activeExpenses.reduce((s, t) => s + t.amount, 0),
    [activeExpenses]
  )

  const days = getDays(period)
  const dailyAvg = activeTotal / days

  const dailyMap = useMemo(() => {
    const m = new Map<string, TransactionWithDetails[]>()
    for (const tx of activeExpenses) {
      const arr = m.get(tx.date) ?? []
      arr.push(tx)
      m.set(tx.date, arr)
    }
    return m
  }, [activeExpenses])

  // Fix: use reduce with explicit return type instead of let variable
  const biggestDayEntry = useMemo<DayEntry | null>(() => {
    return Array.from(dailyMap.entries()).reduce<DayEntry | null>((best, [date, txs]) => {
      const total = txs.reduce((s, t) => s + t.amount, 0)
      return !best || total > best.total ? { date, total, txs } : best
    }, null)
  }, [dailyMap])

  const biggestExpense = useMemo(
    () => activeExpenses.reduce<TransactionWithDetails | null>(
      (mx, tx) => (!mx || tx.amount > mx.amount ? tx : mx), null
    ),
    [activeExpenses]
  )

  const isFiltered = skippedCats.size > 0

  function toggleCat(id: string) {
    setSkippedCats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2.5 pt-3">
      <div className="rounded-2xl border border-neutral-200 bg-card p-4">
        <p className="text-[11px] text-muted-foreground mb-1">Net this period</p>
        <p className={cn('text-[30px] font-medium leading-none mb-3', net < 0 && 'text-destructive')}>
          {net >= 0 ? '+' : ''}{formatCurrency(net)}
        </p>

        <div className="space-y-1.5 mb-4">
          <div className="h-[3px] bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                spentPercent >= 100 ? 'bg-destructive' :
                spentPercent >= 80  ? 'bg-amber-500'   : 'bg-foreground'
              )}
              style={{ width: `${spentPercent}%` }}
            />
          </div>
          <p className={cn(
            'text-[11px]',
            spentPercent >= 100 ? 'text-destructive font-medium' : 'text-muted-foreground'
          )}>
            {spentPercent}% of income spent
          </p>
        </div>

        <div className="grid grid-cols-2 gap-0 border-t border-neutral-100 pt-3">
          <div className="pr-4 border-r border-neutral-100">
            <p className="text-[10px] text-muted-foreground mb-1">Income</p>
            <p className="text-[13px] font-medium text-green-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="pl-4">
            <p className="text-[10px] text-muted-foreground mb-1">Spent</p>
            <p className="text-[13px] font-medium">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      </div>

      {/* ── Breakdown + Stats card ── */}
      {allCategories.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-card overflow-hidden">

          <div className="px-4 pt-4 pb-3">
            <div className="h-[4px] rounded-full overflow-hidden flex gap-0.5">
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
              <div className="flex-1 bg-muted" />
            </div>
          </div>

          {allCategories.map(cat => {
            const isSkipped = skippedCats.has(cat.id)
            const pct = activeTotal > 0 && !isSkipped
              ? Math.round((cat.amount / activeTotal) * 100)
              : null

            return (
              <div
                key={cat.id}
                className={cn(
                  'flex items-center justify-between px-4 py-[9px] border-b border-neutral-100 transition-opacity',
                  isSkipped && 'opacity-30'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-[7px] h-[7px] rounded-full shrink-0"
                    style={{ backgroundColor: cat.color ?? '#94a3b8' }}
                  />
                  <p className="text-[13px]">{cat.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-muted-foreground min-w-[28px] text-right">
                    {pct !== null ? `${pct}%` : '—'}
                  </span>
                  <span className="text-[13px] font-medium min-w-[82px] text-right">
                    {formatCurrency(cat.amount)}
                  </span>
                  <button
                    onClick={() => toggleCat(cat.id)}
                    aria-label={isSkipped ? `Include ${cat.name}` : `Exclude ${cat.name}`}
                    className={cn(
                      'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                      isSkipped
                        ? 'border-neutral-300 bg-neutral-100'
                        : 'border-neutral-300 bg-transparent'
                    )}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      {isSkipped
                        ? <path d="M1 4h6M4 1v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        : <path d="M1 4h6"        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      }
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}

          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40">
            <div>
              <p className="text-[12px] text-muted-foreground">Total spent</p>
              {isFiltered && (
                <p className="text-[10px] text-muted-foreground italic">excl. skipped</p>
              )}
            </div>
            <p className="text-[13px] font-medium">{formatCurrency(activeTotal)}</p>
          </div>

          <div className="border-t border-neutral-100">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1">
              {isFiltered ? 'Stats (filtered)' : 'Stats'}
            </p>

            <StatRow
              label="Daily average"
              value={formatCurrency(dailyAvg)}
              sub={`over ${days} days`}
            />

            <StatRow
              label="Biggest day"
              value={biggestDayEntry ? formatCurrency(biggestDayEntry.total) : '—'}
              sub={biggestDayEntry ? formatDate(biggestDayEntry.date) : undefined}
              tappable={!!biggestDayEntry}
              onTap={() => biggestDayEntry && setBiggestDayOpen(true)}
            />

            <StatRow
              label="Biggest expense"
              value={biggestExpense ? formatCurrency(biggestExpense.amount) : '—'}
              sub={biggestExpense?.note ?? biggestExpense?.category?.name}
            />

            <div className="flex items-center justify-between px-4 py-[9px]">
              <p className="text-[13px] text-muted-foreground">Transactions</p>
              <div className="text-right">
                <p className="text-[13px] font-medium">{activeExpenses.length + incomes.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {activeExpenses.length} out · {incomes.length} in
                </p>
              </div>
            </div>
          </div>
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