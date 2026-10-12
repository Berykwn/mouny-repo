import { describe, expect, it } from 'vitest'
import { tx } from '@/test/fixtures'
import { toCsv } from './csv'

describe('toCsv', () => {
    it('writes rows oldest first, with the type in the ledger’s words', () => {
        const csv = toCsv([
            tx({ date: '2026-10-02', amount: 25_000, note: 'Kopi', category: { name: 'Food' } }),
            tx({ date: '2026-10-01', type: 'income', amount: 10_000_000, note: 'Gaji' }),
            tx({ date: '2026-10-03', amount: 1_000_000, category: { name: 'Tabungan', is_savings: true } }),
            tx({ date: '2026-10-03', type: 'transfer_out', amount: 500_000, note: 'Transfer to Jago' }),
        ])
        expect(csv.split('\r\n')).toEqual([
            'Date,Type,Category,Note,Account,Amount',
            '2026-10-01,Income,,Gaji,BCA,10000000',
            '2026-10-02,Expense,Food,Kopi,BCA,25000',
            '2026-10-03,Saved,Tabungan,,BCA,1000000',
            '2026-10-03,Transfer out,,Transfer to Jago,BCA,500000',
        ])
    })

    it('quotes commas and keeps formula-like text as text', () => {
        const csv = toCsv([tx({ date: '2026-10-01', note: '=SUM(A1), lunch' })])
        expect(csv.split('\r\n')[1]).toBe(`2026-10-01,Expense,,"'=SUM(A1), lunch",BCA,10000`)
    })
})
