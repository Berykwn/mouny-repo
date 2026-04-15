import { Skeleton } from '@/components/ui/skeleton'

interface SkeletonListProps {
    length?: number
}

export function LoadingContent({ length = 3 }: SkeletonListProps) {
    return (
        <section className="space-y-4">
            {[...Array(length)].map((_, i) => (
                <div key={i} className="flex w-full flex-col gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            ))}
        </section>
    )
}