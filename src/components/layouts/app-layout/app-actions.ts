import { createContext, use } from 'react'

export interface AppActions {
    /** Opens the same add-transaction flow as the layout's Add button (refused while offline or with no period). */
    openAddTransaction: () => void
    /** Opens the command palette (desktop). */
    openCommandPalette: () => void
}

const NOOP: AppActions = { openAddTransaction: () => {}, openCommandPalette: () => {} }

// What the app shell can do from anywhere inside it, so a page's empty state or the
// palette starts a transaction the same way the Add button does.
export const AppActionsContext = createContext<AppActions>(NOOP)

export function useAppActions(): AppActions {
    return use(AppActionsContext)
}
