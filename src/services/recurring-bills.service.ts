import { supabase } from '@/lib/supabase'
import { handleError, invalidatesOnWrite, sessionUser, type ServiceResult, SIGNED_OUT_MESSAGE } from './_base'
import { transactionsService } from './transactions.service'
import type { RecurringBill, RecurringBillInsert, RecurringBillUpdate, Transaction } from '@/types'

export type BillInput = Omit<RecurringBillInsert, 'id' | 'user_id' | 'created_at'>

export interface PayBillInput {
    bill: Pick<RecurringBill, 'id' | 'name' | 'category_id'>
    amount: number
    account_id: string
    date: string
    pay_period_id: string
}

/** The table doesn't exist yet: the recurring bills migration hasn't been run. */
function isMissingTable(error: { code?: string } | null) {
    return error?.code === 'PGRST205' || error?.code === '42P01'
}

export const recurringBillsService = invalidatesOnWrite({
    async getAll(): Promise<ServiceResult<RecurringBill[]>> {
        try {
            const { data, error } = await supabase
                .from('recurring_bills')
                .select('*')
                .order('name')

            // Before the migration runs, the app works as if there were no bills.
            if (isMissingTable(error)) return { data: [], error: null }
            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async create(input: BillInput): Promise<ServiceResult<RecurringBill>> {
        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

            const { data, error } = await supabase
                .from('recurring_bills')
                .insert({ ...input, user_id: user.id })
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async update(id: string, patch: RecurringBillUpdate): Promise<ServiceResult<RecurringBill>> {
        try {
            const { data, error } = await supabase
                .from('recurring_bills')
                .update(patch)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /** Its payments stay in the ledger as plain expenses. */
    async remove(id: string): Promise<ServiceResult<null>> {
        try {
            const { error } = await supabase.from('recurring_bills').delete().eq('id', id)
            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /** An ordinary expense that points at the bill, which marks it paid for the period. */
    async pay({ bill, amount, account_id, date, pay_period_id }: PayBillInput): Promise<ServiceResult<Transaction>> {
        return transactionsService.create({
            pay_period_id,
            account_id,
            category_id: bill.category_id ?? undefined,
            type: 'expense',
            amount,
            note: bill.name,
            date,
            recurring_bill_id: bill.id,
        })
    },
})
