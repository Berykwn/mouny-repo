import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { LEDGER_PANEL_ID, ledgerTabId, type LedgerTab } from '../lib/ledger'

export type { LedgerTab }

interface LedgerTabsProps {
    active: LedgerTab
    onChange: (tab: LedgerTab) => void
}

const TABS: { key: LedgerTab; label: string }[] = [
    { key: 'calendar', label: 'Calendar' },
    { key: 'all', label: 'All' },
]

export function LedgerTabs({ active, onChange }: LedgerTabsProps) {
    const refs = useRef<Partial<Record<LedgerTab, HTMLButtonElement | null>>>({})

    // Arrow keys move between tabs (and select them), Home/End jump to the ends — the
    // usual tab-list keys; Tab itself moves on to the panel.
    const onKeyDown = (event: KeyboardEvent) => {
        const i = TABS.findIndex(t => t.key === active)
        const next = event.key === 'ArrowRight' ? (i + 1) % TABS.length
            : event.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length
                : event.key === 'Home' ? 0
                    : event.key === 'End' ? TABS.length - 1
                        : null
        if (next === null) return
        event.preventDefault()
        onChange(TABS[next].key)
        refs.current[TABS[next].key]?.focus()
    }

    return (
        <div role="tablist" aria-label="Ledger view" onKeyDown={onKeyDown} className="flex gap-[22px] border-b border-line">
            {TABS.map(tab => (
                <button
                    key={tab.key}
                    ref={el => { refs.current[tab.key] = el }}
                    id={ledgerTabId(tab.key)}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.key}
                    aria-controls={LEDGER_PANEL_ID}
                    tabIndex={active === tab.key ? 0 : -1}
                    onClick={() => onChange(tab.key)}
                    className={cn(
                        'pb-2.5 -mb-px text-[14px]',
                        active === tab.key
                            ? 'font-semibold text-brand border-b-2 border-brand'
                            : 'text-subtle-ink'
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
