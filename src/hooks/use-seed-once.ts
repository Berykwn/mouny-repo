import { useEffect, useRef } from 'react'

/**
 * Runs `apply` once, the first time `data` is loaded: for a form's defaults (first
 * account, first category) that a later background refetch mustn't overwrite.
 */
export function useSeedOnce<T>(data: T | undefined, apply: (data: T) => void) {
    const done = useRef(false)
    useEffect(() => {
        if (data === undefined || done.current) return
        done.current = true
        apply(data)
        // Only the first load counts; `apply` is a fresh closure every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])
}
