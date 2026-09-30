import { HeroGlow, HeroAction } from '@/components/hero'
import { formatCurrency } from '@/lib/helpers'
import { formatMonthYear, type RoadmapStop, type SavingsPace } from '../lib/wish-analytics'

interface ProgressRingProps {
    percent: number
    size?: number
}

function ProgressRing({ percent, size = 92 }: ProgressRingProps) {
    const stroke = 9
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const pct = Math.min(100, Math.max(0, percent))
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-soft)" strokeWidth={stroke} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - pct / 100)}
                    className="transition-[stroke-dashoffset] duration-700"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[19px] font-medium tracking-[-0.02em] text-ink tabular-nums leading-none">{pct}%</span>
                <span className="text-[9.5px] uppercase tracking-[.12em] text-muted-ink mt-1">funded</span>
            </div>
        </div>
    )
}

interface WishHeroProps {
    saved: number
    target: number
    remaining: number
    goalCount: number
    readyCount: number
    pace: SavingsPace | null
    roadmap: RoadmapStop[]
    canAdd: boolean
    onAdd: () => void
}

export function WishHero({ saved, target, remaining, goalCount, readyCount, pace, roadmap, canAdd, onAdd }: WishHeroProps) {
    const percent = target > 0 ? Math.round((saved / target) * 100) : 0
    const last = roadmap[roadmap.length - 1]
    const allReachable = roadmap.length > 0 && roadmap.every(s => s.date !== null)

    let message: string
    if (goalCount === 0) {
        message = 'Add the things you’re saving toward — Mouny will show when they’re within reach.'
    } else if (target === 0) {
        message = 'Set a price on your wishes to see how close you are.'
    } else if (remaining === 0) {
        message = 'Everything on your list is funded. Time to treat yourself.'
    } else if (!pace) {
        message = `${formatCurrency(remaining)} to go. Close your first period to see when you’ll get there.`
    } else if (pace.perDay <= 0) {
        message = `${formatCurrency(remaining)} to go. Recent periods left nothing over, so there’s no estimate yet.`
    } else if (allReachable && last?.date) {
        message = `${formatCurrency(remaining)} to go — at your usual pace, all of it by ${formatMonthYear(last.date)}.`
    } else {
        message = `${formatCurrency(remaining)} to go — some wishes are more than 10 years out at your current pace.`
    }

    return (
        <div className="card p-5 relative overflow-hidden">
            <HeroGlow />

            <div className="relative flex items-center justify-between mb-4">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Your wishes</p>
                <HeroAction onClick={onAdd} disabled={!canAdd}>Wish</HeroAction>
            </div>

            <div className="relative flex items-center gap-4">
                <ProgressRing percent={percent} />
                <div className="min-w-0">
                    <p className="text-[11px] text-muted-ink">Saved so far</p>
                    <p className="text-[26px] font-medium tracking-[-0.02em] leading-tight text-ink tabular-nums truncate">
                        {formatCurrency(saved)}
                    </p>
                    <p className="text-[11.5px] text-muted-ink tabular-nums truncate">
                        of {formatCurrency(target)} · {goalCount} wish{goalCount === 1 ? '' : 'es'}
                    </p>
                    {readyCount > 0 && (
                        <span className="inline-flex mt-2 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-positive/10 text-positive">
                            {readyCount} ready to buy
                        </span>
                    )}
                </div>
            </div>

            <p className="relative mt-4 pt-3 border-t border-line-soft text-[12px] leading-relaxed text-ink">
                {message}
            </p>
        </div>
    )
}
