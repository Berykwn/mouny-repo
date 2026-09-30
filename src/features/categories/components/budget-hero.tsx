import type { ReactNode } from 'react'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { HeroGlow } from '@/components/hero'
import { ProgressBar } from '@/components/progress-bar'

interface BudgetHeroProps {
    /** Hero actions (add / seed), shown in the label row. */
    actions: ReactNode
    categoryCount: number
    expenseCount: number
    incomeCount: number
    /** Sum of every expense category's max budget. */
    totalBudget: number
    budgetedCount: number
    /** Income recorded in the active period so far. */
    periodIncome: number
    /** The active period's expected salary — the base until income is recorded. */
    expectedIncome: number | null
    /** Budgeted categories already past their max this period. */
    overBudgetCount: number
}

/**
 * Categories hero: how the max budgets add up against this period's income. The base is
 * income recorded so far, or the expected salary before payday lands in the ledger.
 */
export function BudgetHero({
    actions, categoryCount, expenseCount, incomeCount,
    totalBudget, budgetedCount, periodIncome, expectedIncome, overBudgetCount,
}: BudgetHeroProps) {
    const usingExpected = periodIncome <= 0 && !!expectedIncome && expectedIncome > 0
    const base = usingExpected ? expectedIncome! : periodIncome
    const pct = base > 0 ? Math.round((totalBudget / base) * 100) : null
    const left = base - totalBudget
    const over = base > 0 && left < 0

    return (
        <header className="card p-5 relative overflow-hidden lg:order-2">
            <HeroGlow />
            <div className="relative flex items-center justify-between gap-2 mb-4">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">
                    {budgetedCount > 0 ? 'Budgeted this period' : 'Categories'}
                </p>
                <div className="flex items-center gap-2">{actions}</div>
            </div>

            {categoryCount === 0 ? (
                <p className="relative text-[13px] text-muted-ink">No categories yet — seed the defaults or add your own.</p>
            ) : budgetedCount === 0 ? (
                <div className="relative">
                    <p className="text-[32px] lg:text-[26px] font-medium tracking-[-0.02em] leading-none text-ink tabular-nums">
                        {categoryCount}
                    </p>
                    <p className="text-[11px] text-muted-ink mt-2">{expenseCount} expense · {incomeCount} income</p>
                    <p className="mt-4 pt-3 border-t border-line-soft text-[12px] leading-relaxed text-ink">
                        Set a max budget on your expense categories to see how they add up against your income.
                    </p>
                </div>
            ) : (
                <div className="relative">
                    <p className="text-[32px] lg:text-[26px] font-medium tracking-[-0.02em] leading-none text-ink tabular-nums">
                        {formatCurrency(totalBudget)}
                    </p>
                    <p className="text-[11px] text-muted-ink mt-2">
                        across {budgetedCount} of {expenseCount} expense categor{expenseCount === 1 ? 'y' : 'ies'}
                    </p>

                    {base > 0 ? (
                        <>
                            <ProgressBar
                                percent={pct ?? 0}
                                color={over ? 'var(--negative)' : undefined}
                                className="mt-4 h-1.5"
                            />
                            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-muted-ink tabular-nums">
                                    {pct}% of {formatCurrency(base)} {usingExpected ? 'expected' : 'income'}
                                </span>
                                <span className={cn('tabular-nums shrink-0', over ? 'text-negative' : 'text-positive')}>
                                    {over ? `${formatCurrency(-left)} over` : `${formatCurrency(left)} free`}
                                </span>
                            </div>
                        </>
                    ) : (
                        <p className="mt-4 text-[11.5px] text-muted-ink">No income recorded this period yet.</p>
                    )}

                    <p className="mt-4 pt-3 border-t border-line-soft text-[12px] leading-relaxed text-ink">
                        {base <= 0
                            ? 'Record this period’s income to see how much of it your budgets claim.'
                            : over
                                ? 'Your budgets add up to more than you bring in — trim a few so they fit.'
                                : `${formatCurrency(left)} isn’t assigned to any budget — room for savings or the unexpected.`}
                        {overBudgetCount > 0 && (
                            <span className="text-negative"> {overBudgetCount} categor{overBudgetCount === 1 ? 'y is' : 'ies are'} already over budget.</span>
                        )}
                    </p>
                </div>
            )}
        </header>
    )
}
