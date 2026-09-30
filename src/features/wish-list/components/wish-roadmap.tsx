import { formatCurrency, formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { formatMonthYear, wishProgress, type RoadmapStop, type SavingsPace } from '../lib/wish-analytics'
import { WishTile } from './wish-tile'

const MAX_STOPS = 5

interface WishRoadmapProps {
    roadmap: RoadmapStop[]
    pace: SavingsPace | null
}

function whenLabel(stop: RoadmapStop): { title: string; sub: string } {
    if (stop.periods === 0) return { title: 'Ready now', sub: 'fully funded' }
    if (!stop.date || stop.periods === null) return { title: 'Not yet', sub: 'no estimate at this pace' }
    return {
        title: formatMonthYear(stop.date),
        sub: `in ~${stop.periods} period${stop.periods === 1 ? '' : 's'}`,
    }
}

/**
 * "When will I get there": each wish's estimated funding date, funding one wish at a
 * time in priority order from what's usually left over at the end of a period.
 */
export function WishRoadmap({ roadmap, pace }: WishRoadmapProps) {
    const shown = roadmap.slice(0, MAX_STOPS)
    const hidden = roadmap.length - shown.length

    return (
        <div className="card overflow-hidden">
            <div className="px-4 pt-4 pb-3">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">When you’ll get there</p>
                <p className="text-[11.5px] text-muted-ink mt-1 leading-relaxed">
                    {pace && pace.perDay > 0
                        ? <>If you set aside what’s usually left over — <span className="text-ink font-medium tabular-nums">{formatCurrency(Math.round(pace.perPeriod))}</span> per period, averaged over your last {pace.basedOn} period{pace.basedOn === 1 ? '' : 's'} — urgent wishes first.</>
                        : pace
                            ? 'Your recent periods spent everything that came in, so there’s nothing to project yet. Wishes already funded still show here.'
                            : 'Estimates start once you’ve closed a period — they’re based on what you usually have left over.'}
                </p>
            </div>

            {shown.length === 0 ? (
                <p className="px-4 pb-4 text-[11.5px] text-muted-ink">Give a wish a price to put it on the road.</p>
            ) : (
                <ol className="px-4 pb-2">
                    {shown.map((stop, i) => {
                        const { title, sub } = whenLabel(stop)
                        const { remaining } = wishProgress(stop.item)
                        const isLast = i === shown.length - 1
                        return (
                            <li key={stop.item.id} className="relative flex gap-3 pb-3">
                                {/* Timeline rail */}
                                {!isLast && <span aria-hidden className="absolute left-[19px] top-11 bottom-0 w-px bg-line" />}
                                <WishTile name={stop.item.name} icon={stop.item.icon} />
                                <div className="flex-1 min-w-0 flex items-start justify-between gap-3 pt-0.5">
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-ink truncate">{stop.item.name}</p>
                                        <p className="text-[11px] text-muted-ink tabular-nums">
                                            {remaining ? `${formatShortCurrency(remaining)} to go` : 'nothing left to save'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn(
                                            'text-[12.5px] font-medium tabular-nums',
                                            stop.periods === 0 ? 'text-positive' : stop.date ? 'text-ink' : 'text-subtle-ink'
                                        )}>
                                            {title}
                                        </p>
                                        {stop.date && stop.periods && stop.item.target_date && stop.date > stop.item.target_date ? (
                                            <p className="text-[10.5px] text-warning">after your {formatMonthYear(stop.item.target_date)} date</p>
                                        ) : (
                                            <p className="text-[10.5px] text-subtle-ink">{sub}</p>
                                        )}
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ol>
            )}

            {hidden > 0 && (
                <p className="px-4 pb-3 -mt-1 text-[11px] text-subtle-ink">and {hidden} more further down the road</p>
            )}
        </div>
    )
}
