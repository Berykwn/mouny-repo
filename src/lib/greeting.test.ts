import { describe, expect, it } from 'vitest'
import { displayName, firstName, greeting } from './greeting'

const at = (h: number) => new Date(2026, 9, 27, h, 30)

describe('greeting', () => {
    it('follows the clock', () => {
        expect(greeting(at(6))).toBe('Good morning')
        expect(greeting(at(12))).toBe('Good afternoon')
        expect(greeting(at(19))).toBe('Good evening')
        expect(greeting(at(23))).toBe('Up late')
        expect(greeting(at(2))).toBe('Up late')
    })
})

describe('displayName / firstName', () => {
    it('reads the saved name, tidied', () => {
        const user = { user_metadata: { full_name: '  budi   santoso ' } }
        expect(displayName(user)).toBe('budi santoso')
        expect(firstName(user)).toBe('budi')
    })

    it('is null without a name', () => {
        expect(displayName(null)).toBeNull()
        expect(displayName({ user_metadata: { full_name: '   ' } })).toBeNull()
        expect(firstName({ user_metadata: {} })).toBeNull()
    })
})
