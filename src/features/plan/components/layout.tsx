import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus } from 'lucide-react'
import { useTopBarSlotNode } from '@/contexts/TopBarSlotContext'
import { cn } from '@/lib/utils'

interface PlanHeaderProps {
    title: string
    /** The page's add action: a plus on the phone, a labelled button in the desktop top bar. */
    add?: { label: string; onClick: () => void; disabled?: boolean }
    /** Extra quiet buttons for the desktop top bar, before the add one. */
    extra?: ReactNode
}

/** A Plan page's header: back on the phone, the page's actions in the desktop top bar. */
export function PlanHeader({ title, add, extra }: PlanHeaderProps) {
    const slot = useTopBarSlotNode()
    const navigate = useNavigate()
    const location = useLocation()
    // Back to wherever you came from; opened directly (no history in the app), back to Plan.
    const back = () => (location.key !== 'default' ? navigate(-1) : navigate('/plan'))
    return (
        <>
            {slot && (add || extra) && createPortal(
                <>
                    {extra}
                    {add && (
                        <OutlineButton onClick={add.onClick} disabled={add.disabled}>
                            <Plus className="w-4 h-4" strokeWidth={2} /> {add.label}
                        </OutlineButton>
                    )}
                </>,
                slot,
            )}
            <header className="lg:hidden flex items-center gap-2 px-2 pt-[18px] pb-2">
                <button type="button" onClick={back} aria-label="Back" className="w-10 h-10 rounded-full flex items-center justify-center text-ink hover:bg-surface-hover">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="flex-1 text-[20px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
                {add && (
                    <button
                        type="button"
                        onClick={add.onClick}
                        disabled={add.disabled}
                        aria-label={add.label}
                        className="w-10 h-10 mr-2 rounded-[12px] border border-line bg-surface flex items-center justify-center text-ink hover:bg-surface-hover disabled:opacity-50"
                    >
                        <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
                    </button>
                )}
            </header>
        </>
    )
}

export function OutlineButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="h-9 px-3.5 rounded-[10px] border border-line bg-surface text-ink text-[13px] font-semibold flex items-center gap-1.5 hover:bg-surface-hover transition-colors disabled:opacity-50"
        >
            {children}
        </button>
    )
}

/** A titled group of rows, with a quiet total or count on the right. */
export function PlanSection({ title, meta, action, children, className }: {
    title: string
    meta?: ReactNode
    action?: ReactNode
    children: ReactNode
    className?: string
}) {
    return (
        <section className={className}>
            <div className="flex items-baseline justify-between gap-3 px-1 mb-1">
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
                {action ?? (meta !== undefined && <span className="text-[12px] text-subtle-ink tabular-nums">{meta}</span>)}
            </div>
            <div className="divide-y divide-line-soft">{children}</div>
        </section>
    )
}

interface PlanRowProps {
    lead: ReactNode
    title: string
    sub?: ReactNode
    subClassName?: string
    /** An amount, or a button such as Pay. */
    end?: ReactNode
    onOpen?: () => void
}

/** One quiet row: a tile, a name with one line under it, and an amount or an action. */
export function PlanRow({ lead, title, sub, subClassName, end, onOpen }: PlanRowProps) {
    const body = (
        <>
            {lead}
            <span className="flex-1 min-w-0">
                <span className="block text-[14px] text-ink truncate">{title}</span>
                {sub && <span className={cn('block text-[12px] truncate', subClassName ?? 'text-muted-ink')}>{sub}</span>}
            </span>
        </>
    )
    return (
        <div className="flex items-center gap-3 px-1 py-2.5">
            {onOpen ? (
                <button type="button" onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-[12px]">
                    {body}
                </button>
            ) : (
                <div className="flex-1 min-w-0 flex items-center gap-3">{body}</div>
            )}
            {end !== undefined && <div className="shrink-0">{end}</div>}
        </div>
    )
}

/** A row's amount, right-aligned and tabular. */
export function RowAmount({ children, sub, muted }: { children: ReactNode; sub?: ReactNode; muted?: boolean }) {
    return (
        <span className="block text-right">
            <span className={cn('block text-[14px] font-medium tabular-nums', muted ? 'text-muted-ink' : 'text-ink')}>{children}</span>
            {sub && <span className="block text-[11px] text-subtle-ink tabular-nums">{sub}</span>}
        </span>
    )
}

/** The small outlined pill on a row, like "Pay 350rb". */
export function PillButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="h-9 px-3.5 rounded-full border border-line bg-surface text-ink text-[13px] font-semibold tabular-nums hover:bg-surface-hover transition-colors disabled:opacity-50"
        >
            {children}
        </button>
    )
}

/** Two to four headline numbers side by side, split by hairlines. */
export function Kpis({ items, className }: {
    items: { label: string; value: ReactNode; sub?: ReactNode; valueClassName?: string }[]
    className?: string
}) {
    return (
        <div className={cn('card grid divide-x divide-line overflow-hidden', className)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map(k => (
                <div key={k.label} className="px-4 py-3.5 min-w-0">
                    <p className="text-[12px] text-muted-ink truncate">{k.label}</p>
                    <p className={cn('mt-0.5 text-[19px] font-semibold tracking-[-0.02em] tabular-nums truncate', k.valueClassName ?? 'text-ink')}>{k.value}</p>
                    {k.sub && <p className="text-[11.5px] text-subtle-ink truncate">{k.sub}</p>}
                </div>
            ))}
        </div>
    )
}
