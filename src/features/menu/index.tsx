import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, History, LogOut, Download, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'
import { downloadCsv, toCsv } from '@/lib/csv'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { PeriodPickerDrawer } from '@/components/period-picker-drawer'
import { queryKeys, useBudgets, useCategories, usePeriods } from '@/queries'
import { transactionsService } from '@/services/transactions.service'
import { notificationsService } from '@/services/notifications.service'
import { useAuth } from '@/hooks/use-auth'
import { getInitials } from '@/lib/helpers'
import type { PayPeriod } from '@/types'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { RemindersSection } from '@/features/notifications/notification-settings'
import { Row } from './rows'

export default function MenuPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [logoutConfirm, setLogoutConfirm] = useState(false)
    const { periods, activePeriod, isSuccess: periodsLoaded } = usePeriods()
    const { data: categories } = useCategories()
    const { data: budgets } = useBudgets()
    const closedPeriods = periods.filter(p => p.status === 'closed').length

    async function handleLogout() {
        setLogoutConfirm(false)
        // Whoever signs in next on this device shouldn't get this account's reminders.
        await notificationsService.disableDevice()
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
    }

    const name = user?.user_metadata?.full_name as string | undefined
    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
        : null

    return (
        <>
            <PageHeader title="Settings" back="/" />
            <section className="px-4 pb-6 lg:px-0 lg:max-w-[600px]">
                {/* Who's signed in */}
                <div className="flex items-center gap-3.5 py-3 border-b border-line-soft">
                    <div className="w-11 h-11 rounded-full bg-ink flex items-center justify-center shrink-0">
                        <span className="text-[15px] font-semibold text-on-ink">{getInitials(user)}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[16px] font-medium text-ink truncate">{name || 'Your account'}</p>
                        <p className="text-[13px] text-subtle-ink truncate">
                            {user?.email}{memberSince && ` · since ${memberSince}`}
                        </p>
                    </div>
                </div>

                {/* The sidebar has these on desktop */}
                <div className="lg:hidden mt-6">
                    <h2 className="text-[17px] font-semibold text-ink mb-1">Money</h2>
                    <nav className="-mx-4 divide-y divide-line-soft">
                        <Row
                            to="/category" icon={Tag} tint="neutral" label="Categories"
                            sub={categories && budgets ? `${categories.length} categories · ${budgets.length} budget${budgets.length === 1 ? '' : 's'}` : 'Icons, kinds and budgets'}
                        />
                        <Row
                            to="/period-history" icon={History} tint="neutral" label="Periods"
                            sub={periodsLoaded ? (activePeriod ? `1 running · ${closedPeriods} closed` : `${closedPeriods} closed`) : 'Open, close and look back'}
                        />
                    </nav>
                </div>

                <div className="mt-6">
                    <h2 className="text-[17px] font-semibold text-ink mb-2">Appearance</h2>
                    <ThemeSegment />
                </div>

                <div className="mt-7">
                    <RemindersSection />
                </div>

                <div className="mt-7">
                    <h2 className="text-[17px] font-semibold text-ink mb-1">Data</h2>
                    <ExportRow periods={periods} activePeriodId={activePeriod?.id ?? null} />
                </div>

                <button
                    type="button"
                    onClick={() => setLogoutConfirm(true)}
                    className="mt-6 w-full h-12 rounded-[14px] bg-line-soft text-[15px] font-semibold text-ink hover:bg-surface-hover transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut className="w-4 h-4" strokeWidth={2} /> Log out
                </button>
                <p className="mt-3 text-center text-[12.5px] text-subtle-ink tabular-nums">Mouny v{__APP_VERSION__}</p>

                <ConfirmDrawer
                    open={logoutConfirm}
                    title="Log out"
                    description="You’ll need to sign in again to see your money."
                    confirmLabel="Log out"
                    loading={false}
                    onConfirm={handleLogout}
                    onClose={() => setLogoutConfirm(false)}
                />
            </section>
        </>
    )
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
    { value: 'system', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
]

function ThemeSegment() {
    const { theme, setTheme } = useTheme()
    return (
        <div role="radiogroup" aria-label="Theme" className="flex rounded-[12px] bg-line-soft p-[3px]">
            {THEME_OPTIONS.map(({ value, label }) => (
                <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={theme === value}
                    onClick={() => setTheme(value)}
                    className={cn(
                        'flex-1 h-10 rounded-[9px] text-[14px] font-semibold transition-colors',
                        theme === value ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.1)]' : 'text-muted-ink hover:text-ink'
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    )
}

/** Export CSV: pick a period, and its transactions (notes included) download as a sheet. */
function ExportRow({ periods, activePeriodId }: { periods: PayPeriod[]; activePeriodId: string | null }) {
    const [picking, setPicking] = useState(false)
    const [exporting, setExporting] = useState(false)

    async function exportPeriod(period: PayPeriod) {
        setPicking(false)
        setExporting(true)
        try {
            // The ledger's own cache entry, so a period already open there isn't fetched again.
            const txs = await queryClient.fetchQuery({
                queryKey: queryKeys.transactions(period.id),
                queryFn: async () => {
                    const { data, error } = await transactionsService.getByPeriod(period.id)
                    if (error) throw new Error(error)
                    return data ?? []
                },
            })
            if (txs.length === 0) { toast('That period has no transactions to export.'); return }
            downloadCsv(`transactions-${period.start_date}.csv`, toCsv(txs))
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'The export didn’t work.')
        } finally {
            setExporting(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setPicking(true)}
                disabled={exporting || periods.length === 0}
                className="w-full flex items-center gap-3 py-3 text-left rounded-[12px] hover:bg-surface-soft transition-colors disabled:opacity-60"
            >
                <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 bg-line-soft text-ink/70">
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" strokeWidth={1.9} />}
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block text-[15px] text-ink">Export CSV</span>
                    <span className="block text-[13px] text-subtle-ink truncate">
                        {periods.length === 0 ? 'Nothing to export yet' : 'Any period, notes included'}
                    </span>
                </span>
                <ChevronRight className="w-4 h-4 text-faint-ink shrink-0" />
            </button>
            <PeriodPickerDrawer
                open={picking}
                onClose={() => setPicking(false)}
                periods={periods}
                activePeriodId={activePeriodId}
                onSelect={p => void exportPeriod(p)}
            />
        </>
    )
}
