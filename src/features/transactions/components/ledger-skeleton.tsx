import { Skeleton } from '@/components/ui/skeleton'

/** The hero, the tabs and the calendar in outline while a period loads. */
export function LedgerSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading ledger" className="space-y-4">
            <div className="card p-5 lg:max-w-[856px]">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="mt-4 h-8 w-44" />
                <Skeleton className="mt-2.5 h-3 w-36" />
                <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
                <div className="mt-3 grid grid-cols-3 gap-3">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="space-y-1.5">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3.5 w-16" />
                        </div>
                    ))}
                </div>
                <Skeleton className="mt-4 h-3.5 w-full" />
            </div>
            <div className="flex gap-[22px] border-b border-line pb-2.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8" />
            </div>
            <div className="card px-4 pt-[18px] pb-4 lg:max-w-[480px]">
                <Skeleton className="h-3 w-24" />
                <div className="mt-4 grid grid-cols-7 gap-[5px]">
                    {Array.from({ length: 35 }, (_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-[9px]" />
                    ))}
                </div>
            </div>
        </div>
    )
}
