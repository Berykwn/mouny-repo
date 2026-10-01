import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { usePeriods } from '@/queries'
import type { PayPeriod } from '@/types'

interface PeriodStore {
    /** The period picked in Overview or Ledger; null follows the active one. */
    selectedPeriodId: string | null
    setSelectedPeriodId: (id: string | null) => void
}

/**
 * Which period Overview and Ledger are looking at, shared so picking one on a page
 * carries over to the other. Kept for the browser tab's session, so a reload doesn't
 * jump back to the active period either.
 */
export const usePeriodStore = create<PeriodStore>()(
    persist(
        set => ({
            selectedPeriodId: null,
            setSelectedPeriodId: id => set({ selectedPeriodId: id }),
        }),
        { name: 'mouny-selected-period', storage: createJSONStorage(() => sessionStorage) },
    ),
)

/** The picked period, or the active one when nothing (or a period that's gone) is picked. */
export function resolveSelectedPeriod(periods: PayPeriod[], activePeriod: PayPeriod | null, selectedPeriodId: string | null): PayPeriod | null {
    return (selectedPeriodId && periods.find(p => p.id === selectedPeriodId)) || activePeriod || periods[0] || null
}

/** The periods, the active one, and the one the user picked (the active one by default). */
export function useSelectedPeriod() {
    const { periods, activePeriod, isPending, error } = usePeriods()
    const selectedPeriodId = usePeriodStore(s => s.selectedPeriodId)
    const setSelectedPeriodId = usePeriodStore(s => s.setSelectedPeriodId)

    const selectedPeriod = resolveSelectedPeriod(periods, activePeriod, selectedPeriodId)

    return {
        periods,
        activePeriod,
        selectedPeriod,
        isActivePeriod: !!selectedPeriod && selectedPeriod.id === activePeriod?.id,
        isPending,
        error,
        // Picking the active period goes back to following it, so a newly opened
        // period is what shows next.
        selectPeriod: (period: PayPeriod) => setSelectedPeriodId(period.id === activePeriod?.id ? null : period.id),
    }
}
