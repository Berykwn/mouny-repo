import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/helpers'
import type { PayPeriod } from '@/types'
import { History, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { transactionsService } from '@/services/transactions.service'
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card'

interface PeriodHistoryProps {
    periods: PayPeriod[]
}

type Summary = {
    income: number
    expense: number
    net: number
}

export function PeriodHistory({ periods }: PeriodHistoryProps) {
    const closed = periods.filter(p => p.status === 'closed')

    const [summaryMap, setSummaryMap] = useState<Record<string, Summary>>({})
    const [openId, setOpenId] = useState<string | null>(null)

    useEffect(() => {
        if (closed.length === 0) return

        const load = async () => {
            const results: Record<string, Summary> = {}

            for (const p of closed) {
                const { data } = await transactionsService.getPeriodSummary(p.id)

                results[p.id] = data ?? {
                    income: 0,
                    expense: 0,
                    net: 0,
                }
            }

            setSummaryMap(results)
        }

        load()
    }, [closed])

    if (closed.length === 0) return null

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Period History</h3>
            </div>

            {closed.map((p) => {
                const summary = summaryMap[p.id]
                const isOpen = openId === p.id

                return (
                    <Card
                        key={p.id}
                        className="py-0 gap-0 cursor-pointer transition-all"
                        onClick={() => setOpenId(isOpen ? null : p.id)}
                    >
                        <CardHeader className="pt-5 pb-3">
                            <CardTitle>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium">
                                            {formatDate(p.start_date)}
                                            {p.end_date && ` — ${formatDate(p.end_date)}`}
                                        </p>

                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-muted-foreground">
                                                Closed -
                                            </p>
                                            <p
                                                className={cn(
                                                    'text-xs font-medium',
                                                    summary?.net >= 0
                                                        ? 'text-green-600'
                                                        : 'text-destructive'
                                                )}
                                            >
                                                {summary ? formatCurrency(summary.net) : '-'}
                                            </p>
                                        </div>
                                    </div>

                                    <ChevronDown
                                        className={cn(
                                            'w-4 h-4 text-muted-foreground transition-transform',
                                            isOpen && 'rotate-180'
                                        )}
                                    />
                                </div>
                            </CardTitle>
                        </CardHeader>

                        {isOpen && (
                            <>
                                <CardContent className="py-2">
                                    <div className="flex justify-between text-xs">
                                        <div>
                                            <p className="text-muted-foreground">Salary</p>
                                            <p className="font-medium">
                                                {formatCurrency(p.salary_amount)}
                                            </p>
                                        </div>

                                        {p.closing_balance !== null && (
                                            <div>
                                                <p className="text-muted-foreground">Closing</p>
                                                <p
                                                    className={cn(
                                                        'font-medium',
                                                        p.closing_balance >= 0
                                                            ? 'text-green-600'
                                                            : 'text-destructive'
                                                    )}
                                                >
                                                    {formatCurrency(p.closing_balance)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>

                                <CardFooter className="pb-5 pt-2">
                                    <div className="w-full">
                                        <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
                                            <div>
                                                <p className="text-muted-foreground">Income</p>
                                                <p className="font-medium text-green-600">
                                                    {summary
                                                        ? formatCurrency(summary.income)
                                                        : '-'}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-muted-foreground">Expense</p>
                                                <p className="font-medium text-destructive">
                                                    {summary
                                                        ? formatCurrency(summary.expense)
                                                        : '-'}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-muted-foreground">Net</p>
                                                <p
                                                    className={cn(
                                                        'font-medium',
                                                        summary?.net >= 0
                                                            ? 'text-green-600'
                                                            : 'text-destructive'
                                                    )}
                                                >
                                                    {summary
                                                        ? formatCurrency(summary.net)
                                                        : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        {p.notes && (
                                            <p className="text-xs text-muted-foreground pt-1">
                                                {p.notes}
                                            </p>
                                        )}
                                    </div>
                                </CardFooter>
                            </>
                        )}
                    </Card>
                )
            })}
        </div>
    )
}