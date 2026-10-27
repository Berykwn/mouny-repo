import { cn } from '@/lib/utils'

interface ProgressBarProps {
    percent: number
    color?: string
    className?: string
    /**
     * What the bar measures, for screen readers. Without one the bar is for the eye only,
     * and the text beside it is expected to say the same thing.
     */
    label?: string
}

export function ProgressBar({ percent, color = 'var(--brand)', className, label }: ProgressBarProps) {
    const pct = Math.min(100, Math.max(0, percent))

    return (
        <div
            {...(label
                ? { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct) }
                : { 'aria-hidden': true })}
            className={cn('h-1 bg-line-soft rounded-full overflow-hidden', className)}
        >
            <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    )
}
