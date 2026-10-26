import { useRouteError } from 'react-router-dom'
import { RotateCw } from 'lucide-react'

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
        <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-surface">
            <div className="max-w-[340px] w-full flex flex-col items-center text-center">
                <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-16 h-16" />
                <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.01em] text-ink">
                    {stale ? 'A new version is ready' : 'This page didn’t load'}
                </h1>
                <p className="mt-1.5 text-[14px] text-muted-ink leading-relaxed">
                    {stale
                        ? 'Mouny was updated while this page was open. Reload to continue.'
                        : 'Something went wrong showing it. Your data is safe; trying again usually fixes it.'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-5 h-11 px-5 rounded-[12px] bg-action text-on-action text-[14px] font-semibold hover:bg-action/90 transition-colors flex items-center gap-2"
                >
                    <RotateCw className="w-4 h-4" />
                    {stale ? 'Reload' : 'Try again'}
                </button>
            </div>
        </div>
    )
}
