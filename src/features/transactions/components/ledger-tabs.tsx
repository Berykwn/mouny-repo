import { cn } from '@/lib/utils'

export type LedgerTab = 'calendar' | 'analytics' | 'all'

interface LedgerTabsProps {
    active: LedgerTab
    onChange: (tab: LedgerTab) => void
}

const TABS: { key: LedgerTab; label: string }[] = [
    { key: 'calendar', label: 'Calendar' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'all', label: 'All' },
]

export function LedgerTabs({ active, onChange }: LedgerTabsProps) {
    return (
        <div className="flex gap-[22px] border-b border-line">
            {TABS.map(tab => (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={cn(
                        'pb-2.5 -mb-px text-[14px]',
                        active === tab.key
                            ? 'font-semibold text-brand border-b-2 border-brand'
                            : 'text-[#9a9a94]'
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
