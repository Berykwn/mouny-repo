import { describe, expect, it, vi } from 'vitest'
import { period } from '@/test/fixtures'

// The store module pulls in the query hooks, which pull in the Supabase client.
vi.mock('@/queries', () => ({ usePeriods: vi.fn() }))

const { resolveSelectedPeriod, usePeriodStore } = await import('./period-store')

const active = period({ id: 'active', status: 'active' })
const closed = period({ id: 'closed', status: 'closed' })
const periods = [active, closed]

describe('resolveSelectedPeriod', () => {
    it('follows the active period when nothing is picked', () => {
        expect(resolveSelectedPeriod(periods, active, null)).toBe(active)
    })

    it('keeps a picked period', () => {
        expect(resolveSelectedPeriod(periods, active, 'closed')).toBe(closed)
    })

    it('falls back to the active period when the pick is gone', () => {
        expect(resolveSelectedPeriod(periods, active, 'deleted')).toBe(active)
    })

    it('falls back to the newest period without an active one, and to null without any', () => {
        expect(resolveSelectedPeriod([closed], null, null)).toBe(closed)
        expect(resolveSelectedPeriod([], null, null)).toBeNull()
    })
})

describe('usePeriodStore', () => {
    it('is one shared pick, so every page sees the same period', () => {
        usePeriodStore.getState().setSelectedPeriodId('closed')
        expect(usePeriodStore.getState().selectedPeriodId).toBe('closed')
        usePeriodStore.getState().setSelectedPeriodId(null)
        expect(usePeriodStore.getState().selectedPeriodId).toBeNull()
    })
})
