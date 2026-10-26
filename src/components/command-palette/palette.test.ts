import { describe, expect, it } from 'vitest'
import { matchScore, searchPalette, type PaletteItem } from './palette-search'
import { isTypingTarget, resolveShortcut } from './shortcuts'

const items: PaletteItem[] = [
    { id: 'new', group: 'Actions', label: 'New transaction' },
    { id: 'home', group: 'Pages', label: 'Home', keywords: ['dashboard'] },
    { id: 'ledger', group: 'Pages', label: 'Ledger', keywords: ['transactions'] },
    { id: 'cat-coffee', group: 'Categories', label: 'Coffee' },
    { id: 'bill-net', group: 'Bills', label: 'Internet' },
    { id: 'debt-andi', group: 'Debts', label: 'Andi' },
    { id: 'debt-sandi', group: 'Debts', label: 'Sandi' },
]

describe('matchScore', () => {
    it('ranks a prefix over a word start over anywhere', () => {
        expect(matchScore('Andi', 'and')).toBe(3)
        expect(matchScore('Kopi Andi', 'and')).toBe(2)
        expect(matchScore('Sandi', 'and')).toBe(1)
        expect(matchScore('Coffee', 'and')).toBe(0)
    })

    it('ignores case and accents', () => {
        expect(matchScore('Café', 'CAFE')).toBe(3)
    })
})

describe('searchPalette', () => {
    it('shows actions and pages as a menu without a query', () => {
        expect(searchPalette(items, '').map(s => s.group)).toEqual(['Actions', 'Pages'])
    })

    it('finds everything that matches, best first within each group', () => {
        const sections = searchPalette(items, 'andi')
        expect(sections).toEqual([{ group: 'Debts', items: [items[5], items[6]] }])
    })

    it('answers to keywords', () => {
        expect(searchPalette(items, 'dash')[0].items[0].id).toBe('home')
    })
})

describe('resolveShortcut', () => {
    const key = (k: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean }> = {}) =>
        ({ key: k, metaKey: false, ctrlKey: false, altKey: false, ...mods })

    it('opens the palette with ⌘K or Ctrl+K, even while typing', () => {
        expect(resolveShortcut(key('k', { metaKey: true }), true, false).action).toBe('palette')
        expect(resolveShortcut(key('K', { ctrlKey: true }), false, false).action).toBe('palette')
    })

    it('keeps single keys out of fields', () => {
        expect(resolveShortcut(key('n'), true, false).action).toBeNull()
        expect(resolveShortcut(key('n'), false, false).action).toBe('new-transaction')
        expect(resolveShortcut(key('/'), false, false).action).toBe('palette')
    })

    it('goes places with G then a letter', () => {
        const g = resolveShortcut(key('g'), false, false)
        expect(g).toEqual({ action: null, pendingG: true })
        expect(resolveShortcut(key('l'), false, true).action).toBe('go-ledger')
        expect(resolveShortcut(key('i'), false, true).action).toBe('go-insights')
        expect(resolveShortcut(key('x'), false, true)).toEqual({ action: null, pendingG: false })
    })

    it('leaves browser shortcuts alone', () => {
        expect(resolveShortcut(key('n', { ctrlKey: true }), false, false).action).toBeNull()
    })
})

describe('isTypingTarget', () => {
    it('knows a field from the page', () => {
        expect(isTypingTarget({ tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget)).toBe(true)
        expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget)).toBe(true)
        expect(isTypingTarget({ tagName: 'BUTTON', isContentEditable: false } as unknown as EventTarget)).toBe(false)
        expect(isTypingTarget(null)).toBe(false)
    })
})
