import { describe, expect, it } from 'vitest'
import { returnTo } from './return-to'

describe('returnTo', () => {
    it('returns the saved in-app page', () => {
        expect(returnTo({ from: '/insights?tab=x' })).toBe('/insights?tab=x')
    })
    it('falls back to Home for anything else', () => {
        expect(returnTo(null)).toBe('/')
        expect(returnTo({})).toBe('/')
        expect(returnTo({ from: 'https://evil.example' })).toBe('/')
        expect(returnTo({ from: '//evil.example' })).toBe('/')
        expect(returnTo({ from: '/login' })).toBe('/')
    })
})
