import { supabase } from '@/lib/supabase'
import { fetchAllPages, handleError, invalidatesOnWrite, sessionUser, isMissingFunction, NULL_ARG, type ServiceResult, SIGNED_OUT_MESSAGE } from './_base'
import type { Transaction, TransactionWithDetails, TransactionType } from '@/types/'
import { EMPTY_PERIOD_SUMMARY, summarizeTransactions, summaryFromTotals, type PeriodSummary } from '@/lib/period-summary'

export interface CreateTransactionInput {
    pay_period_id: string
    account_id: string
    category_id?: string
    type: TransactionType
    amount: number
    note?: string
    date: string
    wish_list_item_id?: string
    debt_id?: string
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
        transfer_id: tx.transfer_id,
        debt_id: tx.debt_id,
        wish_quantity: tx.wish_quantity,
    }
}

export const transactionsService = invalidatesOnWrite({
    async getByPeriod(periodId: string): Promise<ServiceResult<TransactionWithDetails[]>> {
        try {
            const data = await fetchAllPages((from, to) => supabase
                .from('transactions')
                .select(`
          *,
          account:accounts(id, name, type, is_savings),
          category:categories(id, name, color, bg_color, icon, is_savings, kind)
        `)
                .eq('pay_period_id', periodId)
                .order('date', { ascending: false })
                .order('id')
                .range(from, to))

            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async create(input: CreateTransactionInput): Promise<ServiceResult<Transaction>> {
        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

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
     * Change a transaction's amount, account or type. The balance trigger moves the
     * difference, and refuses the change if it overdraws the account; a transfer, debt
     * or wish transaction's money can't be changed this way at all.
     */
    async replace(original: Transaction, input: CreateTransactionInput): Promise<ServiceResult<Transaction>> {
        try {
            const { data, error } = await supabase.rpc('replace_transaction', {
                p_id: original.id,
                p_pay_period_id: input.pay_period_id,
                p_account_id: input.account_id,
                p_category_id: input.category_id ?? NULL_ARG,
                p_type: input.type,
                p_amount: input.amount,
                p_note: input.note ?? NULL_ARG,
                p_date: input.date,
            })
            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * Turn a savings expense into the transfer it was: the money went into a savings
     * account rather than leaving. Same date, period and note; the source balance doesn't
     * move again, the savings account gains it, and the period still counts it as saved.
     */
    async moveToSavings(id: string, accountId: string): Promise<ServiceResult<Transaction>> {
        try {
            const { data, error } = await supabase.rpc('move_to_savings', { p_id: id, p_account_id: accountId })
            if (error) throw error
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
            // Summed in the database: one row per period however many transactions there are.
            const { data: totals, error: rpcError } = await supabase.rpc('period_summaries', { p_period_ids: periodIds })
            if (!isMissingFunction(rpcError)) {
                if (rpcError) throw rpcError
                const summaries: Record<string, PeriodSummary> = {}
                for (const id of periodIds) summaries[id] = EMPTY_PERIOD_SUMMARY
                for (const t of totals ?? []) {
                    summaries[t.pay_period_id] = summaryFromTotals(Number(t.income), Number(t.expense), Number(t.savings))
                }
                return { data: summaries, error: null }
            }

            // No RPC yet: every row, a page at a time, summed here.
            const data = await fetchAllPages((from, to) => supabase
                .from('transactions')
                .select('id, pay_period_id, type, amount, transfer_id, account:accounts(is_savings), category:categories(is_savings)')
                .in('pay_period_id', periodIds)
                .order('id')
                .range(from, to))

            const rowsByPeriod: Record<string, typeof data> = {}
            for (const id of periodIds) rowsByPeriod[id] = []
            for (const tx of data) if (tx.pay_period_id) rowsByPeriod[tx.pay_period_id]?.push(tx)

            const summaries: Record<string, PeriodSummary> = {}
            for (const id of periodIds) summaries[id] = summarizeTransactions(rowsByPeriod[id])

            return { data: summaries, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
})
