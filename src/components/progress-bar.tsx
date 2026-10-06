import { cn } from '@/lib/utils'

interface ProgressBarProps {
    percent: number
    color?: string
    className?: string
}

export function ProgressBar({ percent, color = 'var(--brand)', className }: ProgressBarProps) {
    const pct = Math.min(100, Math.max(0, percent))

    return (
        <div className={cn('h-1 bg-line-soft rounded-full overflow-hidden', className)}>
            <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    )
}
