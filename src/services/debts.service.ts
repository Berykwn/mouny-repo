import { supabase } from '@/lib/supabase'
import { handleError, type ServiceResult } from './_base'
import type { Debt, DebtWithAccount } from '@/types/'

export const debtsService = {
    async getAll(): Promise<ServiceResult<DebtWithAccount[]>> {
        try {
            const { data, error } = await supabase
                .from('debts')
                .select(`
          *,
          pay_from_account:accounts(id, name)
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
                .select(`*, pay_from_account:accounts(id, name)`)
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