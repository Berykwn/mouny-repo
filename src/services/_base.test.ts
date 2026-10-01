import { beforeEach, describe, expect, it, vi } from 'vitest'

const invalidateAll = vi.fn()
vi.mock('@/lib/query-client', () => ({ invalidateAll }))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const { invalidatesOnWrite, isMissingFunction } = await import('./_base')

beforeEach(() => invalidateAll.mockClear())

describe('invalidatesOnWrite', () => {
    const make = () => invalidatesOnWrite({
        async getAll() { return { data: [1], error: null } },
        async create() { return { data: 1, error: null } },
        async remove() { return { data: null, error: 'nope' } },
        async log(): Promise<void> {},
        async pay() { return this.create() },
    })

    it('refreshes the cache after a successful write', async () => {
        await make().create()
        expect(invalidateAll).toHaveBeenCalled()
    })

    it('does not refresh after a read or a failed write', async () => {
        const service = make()
        await service.getAll()
        await service.remove()
        expect(invalidateAll).not.toHaveBeenCalled()
    })

    it('treats a write that returns nothing as a success', async () => {
        await make().log()
        expect(invalidateAll).toHaveBeenCalledTimes(1)
    })

    it('keeps `this` working for methods that call each other', async () => {
        await expect(make().pay()).resolves.toEqual({ data: 1, error: null })
    })
})

describe('isMissingFunction', () => {
    it('recognises PostgREST\'s "function not found"', () => {
        expect(isMissingFunction({ code: 'PGRST202' })).toBe(true)
        expect(isMissingFunction({ code: '23514' })).toBe(false)
        expect(isMissingFunction(null)).toBe(false)
    })
})
