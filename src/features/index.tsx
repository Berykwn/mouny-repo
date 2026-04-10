import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { payPeriodsService } from '@/services/pay-periods.service'
import { formatCurrency, formatDate } from '@/lib/helpers'
import type { Database } from '@/types/database.types'
import { TrendingDown, TrendingUp, Wallet, AlertCircle } from 'lucide-react'

type ActiveSummary = Database['public']['Views']['active_period_summary']['Row']

export default function DashboardPage() {
    const { user } = useAuth()
    const [summary, setSummary] = useState<ActiveSummary | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        payPeriodsService.getActiveSummary().then(({ data }) => {
            setSummary(data)
            setLoading(false)
        })
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-sm text-muted-foreground">Memuat...</div>
            </div>
        )
    }

    // Belum ada periode aktif
    if (!summary) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12 space-y-4 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
                <div className="space-y-1">
                    <h2 className="font-semibold">Belum ada periode aktif</h2>
                    <p className="text-sm text-muted-foreground">
                        Buat periode gaji baru untuk mulai mencatat keuangan kamu.
                    </p>
                </div>
                {/* TODO: tombol buka periode baru */}
            </div>
        )
    }

    // View bisa return null untuk aggregated fields, fallback ke 0
    const salaryAmount = summary.salary_amount ?? 0
    const totalIncome = summary.total_income ?? 0
    const totalExpense = summary.total_expense ?? 0
    const estimatedRemaining = summary.estimated_remaining ?? 0
    const transactionCount = summary.transaction_count ?? 0

    const spentPercent = salaryAmount > 0
        ? Math.round((totalExpense / salaryAmount) * 100)
        : 0

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

            {/* Header */}
            <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                    Halo, {user?.email?.split('@')[0]} 👋
                </p>
                <h1 className="text-xl font-semibold">Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                    Periode: {summary.start_date ? formatDate(summary.start_date) : '-'}
                    {summary.end_date ? ` — ${formatDate(summary.end_date)}` : ' (aktif)'}
                </p>
            </div>

            {/* Sisa aman card */}
            <div className="rounded-xl border bg-card p-6 space-y-3">
                <p className="text-sm text-muted-foreground">Estimasi sisa periode ini</p>
                <p className="text-4xl font-bold tracking-tight">
                    {formatCurrency(estimatedRemaining)}
                </p>
                {/* Progress bar */}
                <div className="space-y-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-foreground rounded-full transition-all"
                            style={{ width: `${Math.min(spentPercent, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {spentPercent}% dari gaji terpakai
                    </p>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Wallet className="w-3.5 h-3.5" />
                        <p className="text-xs">Gaji</p>
                    </div>
                    <p className="text-lg font-semibold">{formatCurrency(salaryAmount)}</p>
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <p className="text-xs">Pemasukan</p>
                    </div>
                    <p className="text-lg font-semibold">{formatCurrency(totalIncome)}</p>
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <p className="text-xs">Pengeluaran</p>
                    </div>
                    <p className="text-lg font-semibold">{formatCurrency(totalExpense)}</p>
                </div>
            </div>

            {/* Transaksi count */}
            <p className="text-xs text-muted-foreground text-center">
                {transactionCount} transaksi di periode ini
            </p>
        </div>
    )
}