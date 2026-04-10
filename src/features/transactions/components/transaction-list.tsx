import { formatCurrency, formatDateShort } from '@/lib/helpers'
import type { TransactionWithDetails } from '@/types'
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TransactionListProps {
    transactions: TransactionWithDetails[]
    onDelete: (id: string) => void
}

// Group transaksi per tanggal
function groupByDate(txs: TransactionWithDetails[]) {
    const map = new Map<string, TransactionWithDetails[]>()
    for (const tx of txs) {
        const key = tx.date
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(tx)
    }
    // Sort descending (terbaru dulu)
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
}

function isToday(dateStr: string) {
    return dateStr === new Date().toISOString().split('T')[0]
}

function isYesterday(dateStr: string) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return dateStr === d.toISOString().split('T')[0]
}

function dateLabel(dateStr: string) {
    if (isToday(dateStr)) return 'Hari ini'
    if (isYesterday(dateStr)) return 'Kemarin'
    return formatDateShort(dateStr)
}

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <p className="text-sm font-medium">Belum ada transaksi</p>
                <p className="text-xs text-muted-foreground">Tap + untuk menambah transaksi pertama</p>
            </div>
        )
    }

    const grouped = groupByDate(transactions)

    return (
        <div className="space-y-6">
            {grouped.map(([date, txs]) => {
                const dailyTotal = txs.reduce((sum, tx) => (
                    tx.type === 'income' ? sum + tx.amount : sum - tx.amount
                ), 0)

                return (
                    <div key={date}>
                        {/* Date header */}
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {dateLabel(date)}
                            </p>
                            <p className={cn(
                                'text-xs font-medium',
                                dailyTotal >= 0 ? 'text-green-600' : 'text-destructive'
                            )}>
                                {dailyTotal >= 0 ? '+' : ''}{formatCurrency(dailyTotal)}
                            </p>
                        </div>

                        {/* Items */}
                        <div className="space-y-1">
                            {txs.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-card border group"
                                >
                                    {/* Icon */}
                                    <div className={cn(
                                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                        tx.type === 'income' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                                    )}>
                                        {tx.type === 'income'
                                            ? <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            : <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />
                                        }
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {tx.note || tx.category?.name || (tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {tx.category?.name && tx.note ? tx.category.name + ' · ' : ''}
                                            {tx.account.name}
                                        </p>
                                    </div>

                                    {/* Amount */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <p className={cn(
                                            'text-sm font-semibold',
                                            tx.type === 'income' ? 'text-green-600' : 'text-foreground'
                                        )}>
                                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </p>
                                        <button
                                            onClick={() => onDelete(tx.id)}
                                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}