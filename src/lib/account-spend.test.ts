import { describe, expect, it } from 'vitest'
import { accountSubline, overspendMessage, spendErrorMessage } from './account-spend'

const everyday = { name: 'BCA', balance: 500_000, role: 'everyday', credit_limit: null }
const card = { name: 'Visa', balance: -1_200_000, role: 'credit', credit_limit: 10_000_000 }
const openCard = { name: 'PayLater', balance: -300_000, role: 'credit', credit_limit: null }

describe('accountSubline', () => {
    it('shows the balance of a non-credit account', () => {
        expect(accountSubline(everyday)).toMatch(/500\.000/)
        expect(accountSubline(everyday)).not.toMatch(/available/)
    })

    it('shows what can still be spent on a card, not its negative balance', () => {
        expect(accountSubline(card)).toMatch(/8\.800\.000 available$/)
        expect(accountSubline(card)).not.toMatch(/-/)
    })

    it('says so when a card has no limit', () => {
        expect(accountSubline(openCard)).toBe('No limit')
    })

    it('never shows a negative amount available on a card past its limit', () => {
        expect(accountSubline({ ...card, balance: -10_500_000 })).toMatch(/^Rp\s?0 available$/)
    })
})

describe('overspendMessage', () => {
    it('allows up to the balance of an everyday account', () => {
        expect(overspendMessage(everyday, 500_000)).toBeNull()
        expect(overspendMessage(everyday, 500_001)).toBe('Insufficient balance in BCA.')
    })

    it('lets a card go below zero, down to its limit', () => {
        expect(overspendMessage(card, 8_800_000)).toBeNull()
        expect(overspendMessage(card, 8_800_001)).toBe('That goes over the credit limit of Visa.')
    })

    it('never stops a card without a limit', () => {
        expect(overspendMessage(openCard, 1e12)).toBeNull()
    })
})

describe('spendErrorMessage', () => {
    it('names the account for the database\'s money errors', () => {
        expect(spendErrorMessage('Insufficient balance.', everyday)).toBe('Insufficient balance in BCA.')
        expect(spendErrorMessage('That goes over the credit limit of Visa.', card)).toBe('That goes over the credit limit of Visa.')
    })

    it('passes other errors through', () => {
        expect(spendErrorMessage('You are offline.', everyday)).toBe('You are offline.')
    })
})
