import { supabase } from '@/lib/supabase'
import { handleError, type ServiceResult } from './_base'
import type { Transaction, TransactionWithDetails, TransactionType } from '@/types/'

export interface CreateTransactionInput {
    pay_period_id: string
    account_id: string
    category_id?: string
    type: TransactionType
    amount: number
    note?: string
    date: string
    wish_list_item_id?: string
}

export const transactionsService = {
    async getByPeriod(periodId: string): Promise<ServiceResult<TransactionWithDetails[]>> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
          *,
          account:accounts(id, name, type),
          category:categories(id, name, color, icon)
        `)
                .eq('pay_period_id', periodId)
                .order('date', { ascending: false })

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async create(input: CreateTransactionInput): Promise<ServiceResult<Transaction>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Belum login')

            const { data, error } = await supabase
                .from('transactions')
                .insert({ ...input, user_id: user.id })
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async update(id: string, input: Partial<CreateTransactionInput>): Promise<ServiceResult<Transaction>> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .update(input)
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
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id)

            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async getPeriodSummary(periodId: string): Promise<ServiceResult<{
        income: number
        expense: number
        net: number
    }>> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('type, amount')
                .eq('pay_period_id', periodId)

            if (error) throw error

            const income = (data ?? [])
                .filter(t => t.type === 'income')
                .reduce((s, t) => s + t.amount, 0)

            const expense = (data ?? [])
                .filter(t => t.type === 'expense')
                .reduce((s, t) => s + t.amount, 0)

            return {
                data: {
                    income,
                    expense,
                    net: income - expense,
                },
                error: null,
            }
        } catch (err) {
            return {
                data: null,
                error: handleError(err),
            }
        }
    }
}