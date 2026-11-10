import { History, Settings, Tag } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { Row } from '@/features/menu/rows'

interface MoreSheetProps {
    open: boolean
    onClose: () => void
}

/**
 * The phone's More tab: the money set-up (Categories, Periods) apart from the app's own
 * preferences (Settings). The desktop sidebar lists the same pages.
 */
export function MoreSheet({ open, onClose }: MoreSheetProps) {
    return (
        <BottomDrawer open={open} onClose={onClose} title="More">
            <nav aria-label="More" className="pb-2">
                <h2 className="text-[12px] font-semibold uppercase tracking-[.08em] text-subtle-ink">Money</h2>
                <div className="-mx-4 mt-1 divide-y divide-line-soft">
                    <Row to="/category" icon={Tag} tint="neutral" label="Categories" sub="Icons, kinds and budgets" onClick={onClose} />
                    <Row to="/period-history" icon={History} tint="neutral" label="Periods" sub="Payday to payday: open, close and look back" onClick={onClose} />
                </div>
                <h2 className="mt-5 text-[12px] font-semibold uppercase tracking-[.08em] text-subtle-ink">App</h2>
                <div className="-mx-4 mt-1">
                    <Row to="/menu" icon={Settings} tint="neutral" label="Settings" sub="Profile, theme, reminders, export and log out" onClick={onClose} />
                </div>
            </nav>
        </BottomDrawer>
    )
}
