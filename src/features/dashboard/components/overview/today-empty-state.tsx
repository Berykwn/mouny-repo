import { useNavigate } from 'react-router-dom'
import { EmptyState, EMPTY_STATE_BUTTON } from '@/components/empty-state'

interface TodayEmptyStateProps {
    closedPeriodsCount: number
    onOpenPeriod: () => void
}

/** No period running: one message and one button, never a believable Rp 0. */
export function TodayEmptyState({ closedPeriodsCount, onOpenPeriod }: TodayEmptyStateProps) {
    const navigate = useNavigate()

    return (
        <EmptyState
            className="min-h-[60vh] justify-center"
            title={closedPeriodsCount > 0 ? 'Payday again?' : 'Let’s start your first period'}
            action={
                <div className="space-y-3">
                    <button type="button" onClick={onOpenPeriod} className={EMPTY_STATE_BUTTON}>
                        Open a period
                    </button>
                    {closedPeriodsCount > 0 && (
                        <button
                            type="button"
                            onClick={() => navigate('/period-history')}
                            className="w-full text-center text-[13px] text-muted-ink hover:text-ink transition-colors"
                        >
                            Or look back at {closedPeriodsCount} closed period{closedPeriodsCount > 1 ? 's' : ''}
                        </button>
                    )}
                </div>
            }
        >
            A period runs from one payday to the next. Open one with the pay you expect, and Mouny works out what you can spend each day.
        </EmptyState>
    )
}
