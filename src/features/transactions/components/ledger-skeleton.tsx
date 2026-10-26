import { Skeleton } from '@/components/ui/skeleton'

/** The search, the filters and a day of rows in outline while a period loads. */
export function LedgerSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading ledger" className="space-y-3 lg:max-w-[600px]">
            <Skeleton className="h-11 w-full rounded-[14px]" />
            <div className="flex gap-2">
                {[40, 76, 64, 80].map(w => (
                    <Skeleton key={w} className="h-8 rounded-full" style={{ width: w }} />
                ))}
            </div>
            <div className="pt-4 flex items-center justify-between">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-16" />
            </div>
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                    <Skeleton className="w-9 h-9 rounded-[11px]" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-3.5 w-16" />
                </div>
            ))}
        </div>
    )
}
