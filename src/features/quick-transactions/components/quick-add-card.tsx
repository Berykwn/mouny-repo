import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { useQuickTransactions } from '@/queries'
import type { PayPeriod, QuickTransactionWithCategory } from '@/types'
import { QuickConfirm } from './quick-confirm'
import { QuickPills, quickName } from './quick-pills'

/** The dashboard's row of quick pills; a tap asks only for the account and a note. */
export function QuickAddCard({ period }: { period: Pick<PayPeriod, 'id' | 'start_date'> }) {
    const { data: quicks } = useQuickTransactions()
    const [picked, setPicked] = useState<QuickTransactionWithCategory | null>(null)

    if (!quicks) return null

    if (quicks.length === 0) {
        return (
            <Link to="/category" className="card flex items-center gap-3 px-4 py-3 hover:bg-surface-soft transition-colors">
                <span className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-brand/10 text-brand shrink-0">
                    <Zap className="w-4 h-4" strokeWidth={1.9} />
                </span>
                <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium text-ink">Set up quick amounts</span>
                    <span className="block text-[11px] text-muted-ink">Open a category and add amounts like Parkir 2rb, then record them in one tap.</span>
                </span>
            </Link>
        )
    }

    return (
        <div className="card px-4 py-3">
            <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink mb-2">Quick add</p>
            <QuickPills quicks={quicks} onPick={setPicked} />

            <BottomDrawer open={!!picked} onClose={() => setPicked(null)} title={picked ? quickName(picked) : ''}>
                {picked && <QuickConfirm key={picked.id} quick={picked} period={period} onDone={() => setPicked(null)} />}
            </BottomDrawer>
        </div>
    )
}
