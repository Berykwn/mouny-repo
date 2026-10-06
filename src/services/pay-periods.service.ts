import { supabase } from '@/lib/supabase'
import { handleError, invalidatesOnWrite, sessionUser, type ServiceResult, SIGNED_OUT_MESSAGE } from './_base'
import type { PayPeriod } from '@/types/'

export const payPeriodsService = invalidatesOnWrite({
    async getActive(): Promise<ServiceResult<PayPeriod>> {
        try {
            const { data, error } = await supabase
                .from('pay_periods')
                .select('*')
                .eq('status', 'active')
                // No active period is a normal state (between pay periods), not an error.
                .maybeSingle()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async getAll(): Promise<ServiceResult<PayPeriod[]>> {
        try {
            const { data, error } = await supabase
                .from('pay_periods')
                .select('*')
                .order('start_date', { ascending: false })

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async openNew(input: {
        start_date: string
        salary_amount: number
        salary_account_id: string
        notes?: string
    }): Promise<ServiceResult<PayPeriod>> {
        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

            const { data, error } = await supabase
                .from('pay_periods')
                .insert({ ...input, user_id: user.id, status: 'active' })
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    // Close the active period: its closing balance and end date are fixed from here on.
    // The database refuses an end date before the period's last transaction and takes the
    // closing balance from the accounts itself (pay_periods_guard); the one sent here only
    // covers a database without that rule.
    async close(id: string, closingBalance: number, endDate: string): Promise<ServiceResult<PayPeriod>> {
        try {
            const { data, error } = await supabase
                .from('pay_periods')
                .update({ status: 'closed', closing_balance: closingBalance, end_date: endDate })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

})