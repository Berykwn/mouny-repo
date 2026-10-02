import { useRouteError } from 'react-router-dom'

/** A page's code from an older deploy that the server no longer has. */
function isStaleChunk(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '')
    return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i.test(message)
}

/**
 * Shown instead of a blank screen when a page throws while rendering or fails to load.
 * After a deploy, a tab still running the old version can ask for page files that are
 * gone; reloading picks up the new version.
 */
export function RouteError() {
    const error = useRouteError()
    const stale = isStaleChunk(error)
    if (!stale) console.error(error)

    return (
        <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950">
            <div className="card p-6 max-w-[340px] w-full text-center">
                <p className="text-[16px] font-medium tracking-[-0.01em] text-ink">
                    {stale ? 'A new version is ready' : 'Something went wrong'}
                </p>
                <p className="mt-1 text-[12px] text-muted-ink leading-relaxed">
                    {stale
                        ? 'Mouny was updated while this page was open. Reload to continue.'
                        : 'This page couldn’t be shown. Reloading usually fixes it; your data is safe.'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 h-10 w-full rounded-[12px] bg-brand text-white text-[13px] font-semibold hover:bg-brand/90 transition-colors"
                >
                    Reload
                </button>
            </div>
        </div>
    )
}
