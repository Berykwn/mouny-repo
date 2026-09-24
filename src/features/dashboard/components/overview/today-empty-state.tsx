import { CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface TodayEmptyStateProps {
    closedPeriodsCount: number
    onOpenPeriod: () => void
}

export function TodayEmptyState({ closedPeriodsCount, onOpenPeriod }: TodayEmptyStateProps) {
    const navigate = useNavigate()

    return (
        <div className="flex min-h-[65vh] flex-col items-center justify-center gap-[22px] px-7 pb-[60px] text-center">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-brand/20 bg-brand/10">
                <CalendarDays className="h-5 w-5 text-brand" />
            </div>

            <div className="space-y-2">
                <h2 className="text-[24px] font-semibold tracking-[-.02em] text-ink">
                    Open a period to start tracking
                </h2>
                <p className="text-[14px] leading-[1.6] text-muted-ink">
                    A pay period runs from the day you get paid until your next payday. Open one
                    with your expected income to start logging transactions.
                </p>
            </div>

            <div className="card w-full px-5 py-[18px]">
                <p className="text-[11px] font-normal uppercase tracking-[.14em] text-muted-ink">
                    Expected income
                </p>
                <p className="mt-1.5 text-[28px] font-medium leading-none tracking-[-.02em] text-subtle-ink">
                    Rp 0
                </p>
            </div>

            <div className="w-full space-y-3">
                <button
                    type="button"
                    onClick={onOpenPeriod}
                    className="h-[52px] w-full rounded-[14px] bg-brand text-[14px] font-semibold text-white transition-colors hover:bg-brand/90"
                >
                    Open period →
                </button>

                {closedPeriodsCount > 0 && (
                    <button
                        type="button"
                        onClick={() => navigate('/period-history')}
                        className="w-full text-center text-[12.5px] text-muted-ink underline underline-offset-2"
                    >
                        or review {closedPeriodsCount} closed period{closedPeriodsCount > 1 ? 's' : ''}
                    </button>
                )}
            </div>
        </div>
    )
}
