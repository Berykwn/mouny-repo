import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PostgrestError } from '@supabase/supabase-js'

const invalidateAll = vi.fn()
vi.mock('@/lib/query-client', () => ({ invalidateAll }))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const { fetchAllPages, invalidatesOnWrite, isMissingFunction } = await import('./_base')

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

describe('fetchAllPages', () => {
    const table = (n: number) => Array.from({ length: n }, (_, i) => i)
    const pagesOf = (rows: number[]) => {
        const requested: [number, number][] = []
        const page = async (from: number, to: number) => {
            requested.push([from, to])
            return { data: rows.slice(from, to + 1), error: null }
        }
        return { page, requested }
    }

    it('keeps going past the 1000-row cap until a short page', async () => {
        const { page, requested } = pagesOf(table(2500))
        const rows = await fetchAllPages(page)
        expect(rows).toHaveLength(2500)
        expect(rows.at(-1)).toBe(2499)
        expect(requested).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
    })

    it('asks once more after an exactly full page', async () => {
        const { page, requested } = pagesOf(table(1000))
        expect(await fetchAllPages(page)).toHaveLength(1000)
        expect(requested).toHaveLength(2)
    })

    it('throws the first error', async () => {
        const error = { message: 'boom', details: '', hint: '', code: 'X', name: 'PostgrestError' } as PostgrestError
        await expect(fetchAllPages(async () => ({ data: null as number[] | null, error }))).rejects.toBe(error)
    })
})
