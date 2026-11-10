import { describe, expect, it } from 'vitest'
import { byUse, countUse } from './category-order'

const cats = [
    { id: 'coffee', name: 'Coffee' },
    { id: 'food', name: 'Food' },
    { id: 'bills', name: 'Bills' },
    { id: 'transport', name: 'Transportation' },
]
const names = (list: { name: string }[]) => list.map(c => c.name)

describe('byUse', () => {
    it('puts the most used first', () => {
        expect(names(byUse(cats, { transport: 12, food: 5, coffee: 1 }))).toEqual(['Transportation', 'Food', 'Coffee', 'Bills'])
    })

    it('breaks ties, and orders the never used, A–Z', () => {
        expect(names(byUse(cats, { food: 3, coffee: 3 }))).toEqual(['Coffee', 'Food', 'Bills', 'Transportation'])
    })

    it('is plain A–Z without counts', () => {
        expect(names(byUse(cats, undefined))).toEqual(['Bills', 'Coffee', 'Food', 'Transportation'])
    })

    it('leaves the list it was given alone', () => {
        const input = cats.slice()
        byUse(input, { transport: 1 })
        expect(input).toEqual(cats)
    })
})

describe('countUse', () => {
    it('counts rows per category and skips uncategorised ones', () => {
        expect(countUse([{ category_id: 'a' }, { category_id: 'b' }, { category_id: 'a' }, { category_id: null }]))
            .toEqual({ a: 2, b: 1 })
    })
})
