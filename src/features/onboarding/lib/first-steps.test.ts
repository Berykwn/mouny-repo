import { describe, expect, it } from 'vitest'
import type { Account, Category } from '@/types'
import { firstStepsState } from './first-steps'

const account = { id: 'a', name: 'BCA' } as Account
const category = { id: 'c', name: 'Food' } as Category

describe('firstStepsState', () => {
    it('starts with the accounts', () => {
        expect(firstStepsState([], [])).toMatchObject({ current: 'accounts', doneCount: 0 })
    })

    it('goes on to categories, then the period', () => {
        expect(firstStepsState([account], [])).toMatchObject({ current: 'categories', doneCount: 1 })
        expect(firstStepsState([account], [category])).toMatchObject({ current: 'period', doneCount: 2 })
    })

    it('still asks for an account when categories came first', () => {
        expect(firstStepsState([], [category])).toMatchObject({ current: 'accounts', doneCount: 1 })
    })
})
