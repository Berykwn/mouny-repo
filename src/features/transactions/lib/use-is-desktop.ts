import { useSyncExternalStore } from 'react'

/** Tailwind's `lg`: where the ledger shows a detail panel instead of a sheet. */
const QUERY = '(min-width: 1024px)'

const supported = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

const subscribe = (onChange: () => void) => {
    if (!supported()) return () => {}
    const media = window.matchMedia(QUERY)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
}

export function useIsDesktop(): boolean {
    return useSyncExternalStore(subscribe, () => supported() && window.matchMedia(QUERY).matches, () => false)
}
