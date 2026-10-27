import { useMemo } from 'react'
import { formatShortCurrency } from '@/lib/helpers'
import { shortDate } from '@/features/bills/lib/bill-labels'
import { CashOutlookChart } from '@/features/dashboard/components/cash-outlook-chart'
import { SpendingByAccountList } from './spending-by-account-card'
import { spendingByAccount } from '../lib/spending-by-account'
import type { CashOutlook } from '@/features/dashboard/lib/cash-outlook'
import type { PeriodStats } from '@/hooks/use-period-stats'
import type { TransactionWithDetails } from '@/types'
import { BlockNote, Em, InsightBlock } from './insight-block'

interface CashFlowTabProps {
    transactions: TransactionWithDetails[]
    stats: PeriodStats
    /** Null for a closed period, or while bills and debts load. */
    outlook: CashOutlook | null
    isActivePeriod: boolean
    onOpenWhatIf: () => void
}

/** Where the everyday money is heading, and which accounts it came out of. */
export function CashFlowTab({ transactions, stats, outlook, isActivePeriod, onOpenWhatIf }: CashFlowTabProps) {
    const accounts = useMemo(() => spendingByAccount(transactions), [transactions])
    const top = accounts.byAccount[0]
    const days = outlook ? outlook.points.length - 1 : 0

    return (
        <div className="lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-4 lg:items-start">
            <InsightBlock
                kicker={`Next ${Math.round(days / 7) || 6} weeks`}
                title={!isActivePeriod
                    ? 'The outlook starts from today, so it’s for the open period.'
                    : !outlook
                        ? 'Working out the weeks ahead…'
                        : outlook.lowest.balance >= 0
                            ? <>Your everyday money stays above zero. Lowest point: <Em>{formatShortCurrency(outlook.lowest.balance)}</Em> on {shortDate(outlook.lowest.date)}.</>
                            : <>Your everyday money <Em tone="negative">dips below zero</Em> around {shortDate(outlook.points.find(p => p.balance < 0)!.date)}.</>}
                sub={outlook ? 'Every bill, debt and payday on the calendar, plus your usual daily pace.' : undefined}
                how={<>
                    Starts from what your everyday (non-savings) accounts hold today. Takes off each bill still unpaid this period and every bill after it on its schedule, debts on their due date (a late one today), and your everyday pace so far ({formatShortCurrency(stats.dailyAvg)}/day) from tomorrow.
                    {' '}Adds each payday with the income this period was opened with, repeating at this period’s length, and receivables on their due date (a late one isn’t counted). Money you move to savings isn’t planned, so it isn’t in here.
                </>}
            >
                {outlook && <CashOutlookChart outlook={outlook} height={220} />}
            </InsightBlock>

            <div className="lg:space-y-4">
                <InsightBlock
                    kicker="Paid from"
                    title={top && accounts.totalSpending > 0
                        ? <>{top.name} paid for <Em>{Math.round((top.amount / accounts.totalSpending) * 100)}%</Em> of this period’s spending.</>
                        : 'No spending yet this period.'}
                    how="This period’s spending by the account it came out of. Savings are left out."
                >
                    <SpendingByAccountList {...accounts} />
                </InsightBlock>

                <InsightBlock
                    kicker="What if"
                    title="See what spending a little less each day does by payday."
                >
                    {isActivePeriod && !stats.isClosed ? (
                        <button
                            type="button"
                            onClick={onOpenWhatIf}
                            className="h-10 rounded-[12px] border border-line px-4 text-[13px] font-semibold text-ink hover:bg-surface-hover transition-colors"
                        >
                            Open what if
                        </button>
                    ) : <BlockNote>Only for the open period: a closed one can’t change.</BlockNote>}
                </InsightBlock>
            </div>
        </div>
    )
}
