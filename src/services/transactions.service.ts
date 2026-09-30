import { supabase } from '@/lib/supabase'
import { handleError, type ServiceResult } from './_base'
import type { Transaction, TransactionWithDetails, TransactionType } from '@/types/'
import { summarizeTransactions, type PeriodSummary } from '@/lib/period-summary'

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
          category:categories(id, name, color, bg_color, icon, is_savings)
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

    async removeMany(ids: string[]): Promise<ServiceResult<null>> {
        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .in('id', ids)

            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async updateMany(ids: string[], input: Partial<CreateTransactionInput>): Promise<ServiceResult<Transaction[]>> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .update(input)
                .in('id', ids)
                .select()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async getPeriodSummary(periodId: string): Promise<ServiceResult<PeriodSummary>> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('type, amount, category:categories(is_savings)')
                .eq('pay_period_id', periodId)

            if (error) throw error

            return { data: summarizeTransactions(data ?? []), error: null }
        } catch (err) {
            return {
                data: null,
                error: handleError(err),
            }
        }
    },

    async getPeriodSummaries(periodIds: string[]): Promise<ServiceResult<Record<string, PeriodSummary>>> {
        if (periodIds.length === 0) return { data: {}, error: null }

        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('pay_period_id, type, amount, category:categories(is_savings)')
                .in('pay_period_id', periodIds)

            if (error) throw error

            const rowsByPeriod: Record<string, NonNullable<typeof data>> = {}
            for (const id of periodIds) rowsByPeriod[id] = []
            for (const tx of data ?? []) rowsByPeriod[tx.pay_period_id]?.push(tx)

            const summaries: Record<string, PeriodSummary> = {}
            for (const id of periodIds) summaries[id] = summarizeTransactions(rowsByPeriod[id])

            return { data: summaries, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
}
