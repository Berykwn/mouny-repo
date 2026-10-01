import { supabase } from '@/lib/supabase'
import { handleError, type ServiceResult } from './_base'
import type { Debt, DebtPayment, DebtWithAccount, Category } from '@/types/'
import { COLORS } from '@/lib/static-colors'

const DEBT_CATEGORIES: Record<string, { type: 'income' | 'expense'; color: string; icon: string }> = {
    'Debt Payment': { type: 'expense', color: COLORS[18] ?? '#6b7280', icon: 'arrow-down-circle' },
    'Receivable': { type: 'expense', color: COLORS[9] ?? '#6b7280', icon: 'arrow-up-circle' },
}

export type DebtPaymentWithAccount = DebtPayment & {
    account: { id: string; name: string } | null
}

export interface DebtEditInput {
    counterparty: string
    total_amount: number
    due_date: string | null
    notes: string | null
}

export const debtsService = {
    async findOrCreateCategory(name: 'Debt Payment' | 'Receivable'): Promise<ServiceResult<Category>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('unauthenticated')

            const meta = DEBT_CATEGORIES[name]
            // Match on type too, and take the oldest if there are several — a second
            // category with the same name must not make every debt payment fail.
            const { data: existing, error: findError } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .eq('name', name)
                .eq('type', meta.type)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle()

            if (findError) throw findError
            if (existing) return { data: existing, error: null }

            const { data, error } = await supabase
                .from('categories')
                .insert({ user_id: user.id, name, ...meta })
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async getAll(): Promise<ServiceResult<DebtWithAccount[]>> {
        try {
            const { data, error } = await supabase
                .from('debts')
                .select(`
                *,
                pay_from_account:accounts(
                    id,
                    name,
                    balance,
                    type
                )
            `)
                .order('due_date', { ascending: true, nullsFirst: false })

            if (error) throw error

            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async getActive(): Promise<ServiceResult<DebtWithAccount[]>> {
        try {
            const { data, error } = await supabase
                .from('debts')
                .select(`
                *,
                pay_from_account:accounts(
                    id,
                    name,
                    balance,
                    type
                )
            `)
                .eq('status', 'active')
                .order('due_date', { ascending: true, nullsFirst: false })

            if (error) throw error

            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async create(input: Omit<Debt, 'id' | 'user_id' | 'created_at'>): Promise<ServiceResult<Debt>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Belum login')

            const { data, error } = await supabase
                .from('debts')
                .insert({ ...input, user_id: user.id })
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async recordPayment(id: string, amountPaid: number): Promise<ServiceResult<Debt>> {
        try {
            const { data: debt, error: fetchError } = await supabase
                .from('debts')
                .select('remaining_amount, total_amount')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            const newRemaining = Math.max(0, debt.remaining_amount - amountPaid)
            const newStatus = newRemaining === 0 ? 'paid' : 'active'

            const { data, error } = await supabase
                .from('debts')
                .update({ remaining_amount: newRemaining, status: newStatus })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * Edit a debt's details. Changing the total keeps what's already been paid: the
     * remaining amount moves by the same difference (never below zero).
     */
    async update(id: string, input: DebtEditInput): Promise<ServiceResult<Debt>> {
        try {
            const { data: debt, error: fetchError } = await supabase
                .from('debts')
                .select('remaining_amount, total_amount')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            const paid = debt.total_amount - debt.remaining_amount
            const remaining = Math.max(0, input.total_amount - paid)

            const { data, error } = await supabase
                .from('debts')
                .update({ ...input, remaining_amount: remaining, status: remaining === 0 ? 'paid' : 'active' })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * Note a payment or collection in the debt's history. Best-effort: the money has
     * already moved by the time this runs, so a failure (e.g. the debt_payments
     * migration hasn't been run yet) must not undo or block anything.
     */
    async logPayment(input: { debt_id: string; amount: number; date: string; account_id: string | null; transaction_id?: string | null }): Promise<void> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            await supabase.from('debt_payments').insert({ ...input, user_id: user.id })
        } catch {
            // History is an extra; ignore.
        }
    },

    async getPayments(debtId: string): Promise<ServiceResult<DebtPaymentWithAccount[]>> {
        try {
            const { data, error } = await supabase
                .from('debt_payments')
                .select('*, account:accounts(id, name)')
                .eq('debt_id', debtId)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async remove(id: string): Promise<ServiceResult<null>> {
        try {
            const { error } = await supabase.from('debts').delete().eq('id', id)
            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
}