import { Skeleton } from '@/components/ui/skeleton'

/** Home in outline while it loads, so nothing jumps when the numbers land. */
export function OverviewSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading overview" className="mt-1.5 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10 lg:items-start">
            <div className="space-y-6">
                {/* Hero: label and status, the big number, its line, the bar and its legend. */}
                <div className="pt-1">
                    <div className="flex justify-between">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3.5 w-16" />
                    </div>
                    <Skeleton className="mt-2.5 h-[44px] w-56" />
                    <Skeleton className="mt-2.5 h-3.5 w-44" />
                    <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
                    <div className="mt-2.5 flex justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
                <Skeleton className="h-12 w-full rounded-[14px]" />
                <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    {[0, 1, 2].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-[12px]" />
                            <Skeleton className="h-3.5 flex-1" />
                            <Skeleton className="h-3.5 w-16" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="hidden lg:block space-y-3">
                <Skeleton className="h-4 w-32" />
                {[0, 1].map(i => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-[12px]" />
                        <Skeleton className="h-3.5 flex-1" />
                        <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}
