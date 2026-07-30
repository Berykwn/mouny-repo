import { cn } from '@/lib/utils'

export type LedgerTab = 'calendar' | 'analytics'

interface LedgerTabsProps {
    active: LedgerTab
    onChange: (tab: LedgerTab) => void
}

const TABS: { key: LedgerTab; label: string }[] = [
    { key: 'calendar', label: 'Calendar' },
    { key: 'analytics', label: 'Analytics' },
]

export function LedgerTabs({ active, onChange }: LedgerTabsProps) {
    return (
        <div className="flex gap-[22px] border-b border-[#e5e5e5]">
            {TABS.map(tab => (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={cn(
                        'pb-2.5 -mb-px text-[14px]',
                        active === tab.key
                            ? 'font-semibold text-[#252525] border-b-2 border-[#252525]'
                            : 'text-[#9a9a94]'
                    )}
                >
                    {tab.label}
                </button>
            ))}
            <span className="pb-2.5 text-[14px] text-[#9a9a94] cursor-not-allowed select-none">
                All
            </span>
        </div>
    )
}
