import { supabase } from '@/lib/supabase'
import { handleError, invalidatesOnWrite, sessionUser, isMissingFunction, type ServiceResult } from './_base'
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

/** Just the table's own columns — a TransactionWithDetails also carries joined account/category. */
function toRow(tx: Transaction): Transaction {
    return {
        id: tx.id,
        user_id: tx.user_id,
        pay_period_id: tx.pay_period_id,
        account_id: tx.account_id,
        category_id: tx.category_id,
        type: tx.type,
        amount: tx.amount,
        note: tx.note,
        date: tx.date,
        created_at: tx.created_at,
        wish_list_item_id: tx.wish_list_item_id,
    }
}

export const transactionsService = invalidatesOnWrite({
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
            const user = await sessionUser()
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

    /** Edits that don't move money: category, note and date (cleared values saved as null). */
    async updateDetails(id: string, input: { category_id: string | null; note: string | null; date: string }): Promise<ServiceResult<Transaction>> {
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

    /**
     * Change a transaction's amount, account or type. Balances follow transactions through
     * the insert/delete triggers, so this deletes the original and inserts the new version
     * (keeping its id, created_at and wish link) rather than trusting an UPDATE to move
     * the money. The `replace_transaction` RPC does both in one database transaction, so
     * a failed insert (e.g. the new amount overdraws the account) undoes the delete.
     */
    async replace(original: Transaction, input: CreateTransactionInput): Promise<ServiceResult<Transaction>> {
        try {
            const { data, error } = await supabase.rpc('replace_transaction', {
                p_id: original.id,
                p_pay_period_id: input.pay_period_id,
                p_account_id: input.account_id,
                p_category_id: input.category_id ?? null,
                p_type: input.type,
                p_amount: input.amount,
                p_note: input.note ?? null,
                p_date: input.date,
            })
            if (!isMissingFunction(error)) {
                if (error) throw error
                return { data, error: null }
            }
            return await this.replaceInSteps(original, input)
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * `replace` for databases without the `replace_transaction` RPC yet: delete, insert,
     * and if the insert fails put the original back. Not atomic — a dropped connection
     * between the steps can lose the transaction.
     */
    async replaceInSteps(original: Transaction, input: CreateTransactionInput): Promise<ServiceResult<Transaction>> {
        try {
            const { error: delError } = await supabase.from('transactions').delete().eq('id', original.id)
            if (delError) throw delError

            const { data, error } = await supabase
                .from('transactions')
                .insert({
                    ...input,
                    id: original.id,
                    user_id: original.user_id,
                    created_at: original.created_at,
                    wish_list_item_id: original.wish_list_item_id,
                })
                .select()
                .single()

            if (error) {
                await supabase.from('transactions').insert(toRow(original))
                throw error
            }
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /** Put a deleted transaction back exactly as it was (the delete's undo). */
    async restore(original: Transaction): Promise<ServiceResult<null>> {
        try {
            const { error } = await supabase.from('transactions').insert(toRow(original))
            if (error) throw error
            return { data: null, error: null }
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
})
