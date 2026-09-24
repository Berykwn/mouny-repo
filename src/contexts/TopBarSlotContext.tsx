import { createContext, use } from "react"

// The desktop top bar (breadcrumb + actions) lives in AppLayout, but content
// like the period picker belongs to whichever page is active. AppLayout hands
// down the DOM node it reserved in that row; pages portal into it instead of
// lifting state up through props/context on every render.
export const TopBarSlotContext = createContext<HTMLDivElement | null>(null)

export function useTopBarSlotNode(): HTMLDivElement | null {
    return use(TopBarSlotContext)
}
