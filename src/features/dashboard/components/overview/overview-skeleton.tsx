import { Skeleton } from '@/components/ui/skeleton'

/** The overview's cards in outline while they load, so nothing jumps when the numbers land. */
export function OverviewSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading overview" className="mt-1.5 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start">
            <div className="space-y-3">
                {/* Headline: label, the big number, the income bar and its legend, the balance row. */}
                <div className="card px-5 py-[22px]">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-2.5 h-[38px] w-48" />
                    <Skeleton className="mt-4 h-2 w-full rounded-full" />
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                    <div className="mt-4 border-t border-line-soft pt-3.5 flex items-end justify-between gap-3">
                        <div>
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="mt-2 h-[22px] w-32" />
                        </div>
                        <Skeleton className="h-3 w-28" />
                    </div>
                </div>
                <div className="card px-5 py-4 space-y-2.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-5/6" />
                    <Skeleton className="h-3.5 w-2/3" />
                </div>
            </div>
            <div className="space-y-3">
                <div className="card px-5 py-4 space-y-3">
                    <Skeleton className="h-3 w-28" />
                    {[0, 1, 2].map(i => (
                        <div key={i} className="flex items-center gap-2.5">
                            <Skeleton className="h-8 w-8 rounded-[10px]" />
                            <Skeleton className="h-3.5 flex-1" />
                            <Skeleton className="h-3.5 w-16" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
