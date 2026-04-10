import { supabase } from '@/lib/supabase'
import { handleError, type ServiceResult } from './_base'
import type { PayPeriod } from '@/types/'

export const payPeriodsService = {
    // Ambil periode yang sedang aktif
    async getActive(): Promise<ServiceResult<PayPeriod>> {
        try {
            const { data, error } = await supabase
                .from('pay_periods')
                .select('*')
                .eq('status', 'active')
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    // Ambil semua periode (untuk riwayat)
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

    // Buka periode baru (saat gajian)
    async openNew(input: {
        start_date: string
        salary_amount: number
        salary_account_id: string
        notes?: string
    }): Promise<ServiceResult<PayPeriod>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Belum login')

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

    // Tutup buku periode aktif
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

    // Summary dari view yang sudah dibuat di DB
    async getActiveSummary() {
        try {
            const { data, error } = await supabase
                .from('active_period_summary')
                .select('*')
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    create: (data: any) => supabase.from('pay_periods').insert(data),

    update: (id: string, data: any) => supabase.from('pay_periods').update(data).eq('id', id),

    setActive: async (periodId: string) => {
        // Close all active periods first
        await supabase
            .from('pay_periods')
            .update({ status: 'closed' })
            .eq('status', 'active')

        // Set new active period
        return supabase
            .from('pay_periods')
            .update({ status: 'active' })
            .eq('id', periodId)
    }
}