import { describe, expect, it } from 'vitest'
import { amountColor, amountSign, isInflow, isTransfer } from './transaction-type'

describe('transaction types', () => {
    it('treats transfers as neither income nor spending', () => {
        expect(isTransfer('transfer_in')).toBe(true)
        expect(isTransfer('transfer_out')).toBe(true)
        expect(isTransfer('income')).toBe(false)
        expect(isTransfer('expense')).toBe(false)
    })

    it('signs money by direction', () => {
        expect(isInflow('income')).toBe(true)
        expect(isInflow('transfer_in')).toBe(true)
        expect(isInflow('transfer_out')).toBe(false)
        expect(amountSign('transfer_in')).toBe('+')
        expect(amountSign('expense')).toBe('−')
    })

    it('mutes transfers', () => {
        expect(amountColor('transfer_out')).toBe('text-muted-ink')
        expect(amountColor('income')).toBe('text-positive')
        expect(amountColor('expense')).toBe('text-ink')
    })
})
