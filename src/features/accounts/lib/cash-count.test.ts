import { describe, expect, it } from 'vitest'
import { actualBalance, choicesFor, recordedFigure, suggestedAs } from './cash-count'

describe('cash count', () => {
    it('reads a credit account as what’s owed, everything else as the balance', () => {
        expect(actualBalance({ role: 'credit' }, 1_200_000)).toBe(-1_200_000)
        expect(actualBalance({ role: 'everyday' }, 150_000)).toBe(150_000)
        expect(recordedFigure({ role: 'credit', balance: -1_200_000 })).toBe(1_200_000)
        expect(recordedFigure({ role: 'credit', balance: 50_000 })).toBe(0)
        expect(recordedFigure({ role: 'everyday', balance: 400_000 })).toBe(400_000)
    })

    it('suggests unrecorded spending when there’s less, a correction when there’s more', () => {
        expect(suggestedAs(-250_000)).toBe('spending')
        expect(suggestedAs(10_000)).toBe('correction')
    })

    it('offers only the choices that fit the difference', () => {
        expect(choicesFor(-250_000)).toEqual(['spending', 'correction'])
        expect(choicesFor(10_000)).toEqual(['income', 'correction'])
    })
})
