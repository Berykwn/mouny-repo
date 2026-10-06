import { supabase } from '@/lib/supabase'
import { handleError, invalidatesOnWrite, sessionUser, type ServiceResult, SIGNED_OUT_MESSAGE } from './_base'
import { transactionsService } from './transactions.service'
import type { QuickTransaction, QuickTransactionWithCategory, Transaction } from '@/types'

export interface RecordQuickInput {
    quick: Pick<QuickTransactionWithCategory, 'id' | 'amount' | 'label' | 'category_id' | 'category' | 'last_account_id'>
    account_id: string
    note: string
    date: string
    pay_period_id: string
}

/** The table doesn't exist yet: the quick transactions migration hasn't been run. */
function isMissingTable(error: { code?: string } | null) {
    return error?.code === 'PGRST205' || error?.code === '42P01'
}

export const quickTransactionsService = invalidatesOnWrite({
    async getAll(): Promise<ServiceResult<QuickTransactionWithCategory[]>> {
        try {
            const { data, error } = await supabase
                .from('quick_transactions')
                .select('*, category:categories(id, name, type, color, bg_color, icon)')
                .order('created_at')

            // Before the migration runs, the app works as if none were set up.
            if (isMissingTable(error)) return { data: [], error: null }
            if (error) throw error
            return { data: data as QuickTransactionWithCategory[], error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async create(input: { category_id: string; amount: number; label: string | null }): Promise<ServiceResult<QuickTransaction>> {
        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

            const { data, error } = await supabase
                .from('quick_transactions')
                .insert({ ...input, user_id: user.id })
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
            const { error } = await supabase.from('quick_transactions').delete().eq('id', id)
            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /** Records the transaction, then remembers the account for next time. */
    async record({ quick, account_id, note, date, pay_period_id }: RecordQuickInput): Promise<ServiceResult<Transaction>> {
        const result = await transactionsService.create({
            pay_period_id,
            account_id,
            category_id: quick.category_id,
            type: quick.category.type === 'income' ? 'income' : 'expense',
            amount: quick.amount,
            // A named quick ("Kopi" under Food) keeps its name on the ledger.
            note: note.trim() || quick.label?.trim() || undefined,
            date,
        })
        if (!result.error && quick.last_account_id !== account_id) {
            // Only a convenience: the transaction is saved either way.
            await supabase.from('quick_transactions').update({ last_account_id: account_id }).eq('id', quick.id)
        }
        return result
    },
})
