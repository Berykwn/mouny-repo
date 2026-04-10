import { supabase } from '@/lib/supabase'
import { handleError, type ServiceResult } from './_base'
import type { WishListItem } from '@/types/'
import { transactionsService } from './transactions.service'

export const wishListService = {
    async getByPeriod(periodId: string): Promise<ServiceResult<WishListItem[]>> {
        try {
            const { data, error } = await supabase
                .from('wish_list')
                .select('*')
                .eq('pay_period_id', periodId)
                .eq('is_purchased', false)
                .order('priority', { ascending: true })

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async create(input: {
        pay_period_id: string
        name: string
        estimated_price?: number
        priority?: WishListItem['priority']
        notes?: string
    }): Promise<ServiceResult<WishListItem>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Belum login')

            const { data, error } = await supabase
                .from('wish_list')
                .insert({ ...input, user_id: user.id, is_purchased: false })
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * Tandai item sebagai sudah dibeli.
     * Otomatis buat transaksi pengeluaran dan link ke wish list item.
     */
    async markAsPurchased(item: WishListItem, input: {
        account_id: string
        category_id?: string
        actual_price: number
        date: string
    }): Promise<ServiceResult<WishListItem>> {
        try {
            // 1. Buat transaksi pengeluaran
            const { data: transaction, error: txError } = await transactionsService.create({
                pay_period_id: item.pay_period_id,
                account_id: input.account_id,
                category_id: input.category_id,
                type: 'expense',
                amount: input.actual_price,
                note: item.name,
                date: input.date,
                wish_list_item_id: item.id,
            })

            if (txError || !transaction) throw new Error(txError ?? 'Gagal membuat transaksi')

            // 2. Update wish list item
            const { data, error } = await supabase
                .from('wish_list')
                .update({ is_purchased: true, transaction_id: transaction.id })
                .eq('id', item.id)
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
            const { error } = await supabase.from('wish_list').delete().eq('id', id)
            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
}