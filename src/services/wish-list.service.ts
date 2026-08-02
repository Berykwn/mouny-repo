import { supabase } from '@/lib/supabase'
import { handleError, type ServiceResult } from './_base'
import type { WishListItem } from '@/types/'
import { transactionsService } from './transactions.service'
import { payPeriodsService } from './pay-periods.service'

export const wishListService = {
    async getAll(): Promise<ServiceResult<WishListItem[]>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not logged in')

            const { data, error } = await supabase
                .from('wish_list')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_purchased', false)
                .order('created_at', { ascending: false })

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
        quantity?: number | null
        unit?: string | null
        price_per_unit?: number | null
    }): Promise<ServiceResult<WishListItem>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not logged in')

            const estimated_price = input.quantity && input.price_per_unit
                ? input.quantity * input.price_per_unit
                : input.estimated_price

            const { data, error } = await supabase
                .from('wish_list')
                .insert({
                    ...input,
                    estimated_price,
                    user_id: user.id,
                    is_purchased: false,
                })
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async update(id: string, input: {
        name?: string
        estimated_price?: number
        priority?: WishListItem['priority']
        notes?: string
        quantity?: number | null
        unit?: string | null
        price_per_unit?: number | null
    }): Promise<ServiceResult<WishListItem>> {
        try {
            const estimated_price = input.quantity && input.price_per_unit
                ? input.quantity * input.price_per_unit
                : input.estimated_price

            const { data, error } = await supabase
                .from('wish_list')
                .update({
                    ...input,
                    estimated_price,
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async contribute(id: string, amount: number): Promise<ServiceResult<WishListItem>> {
        try {
            if (amount <= 0) throw new Error('Amount must be greater than zero.')

            const { data: item, error: fetchError } = await supabase
                .from('wish_list')
                .select('saved_amount')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            const newSaved = Math.max(0, (item.saved_amount ?? 0) + amount)

            const { data, error } = await supabase
                .from('wish_list')
                .update({ saved_amount: newSaved })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async contributeQuantity(
        item: WishListItem,
        input: {
            quantity: number
            price_per_unit: number
            account_id: string
            category_id?: string
            date: string
        }
    ): Promise<ServiceResult<WishListItem>> {
        try {
            if (input.quantity <= 0) throw new Error('Quantity must be greater than zero.')

            const { data: period, error: periodError } =
                await payPeriodsService.getActive()

            if (periodError || !period) {
                throw new Error('No active period found')
            }

            const amount = input.quantity * input.price_per_unit

            const { data: transaction, error: txError } =
                await transactionsService.create({
                    pay_period_id: period.id,
                    account_id: input.account_id,
                    category_id: input.category_id,
                    type: 'expense',
                    amount,
                    note: `Cicilan: ${item.name}`,
                    date: input.date,
                    wish_list_item_id: item.id,
                })

            if (txError || !transaction) {
                throw new Error(txError ?? 'Failed to create transaction')
            }

            const newSavedQuantity = (item.saved_quantity ?? 0) + input.quantity
            const newSavedAmount = (item.saved_amount ?? 0) + amount
            const isComplete = !!item.quantity && newSavedQuantity >= item.quantity

            const { data, error } = await supabase
                .from('wish_list')
                .update({
                    saved_quantity: newSavedQuantity,
                    saved_amount: newSavedAmount,
                    is_purchased: isComplete,
                })
                .eq('id', item.id)
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async markAsPurchased(
        item: WishListItem,
        input: {
            account_id: string
            category_id?: string
            actual_price: number
            date: string
        }
    ): Promise<ServiceResult<WishListItem>> {
        try {
            const { data: period, error: periodError } =
                await payPeriodsService.getActive()

            if (periodError || !period) {
                throw new Error('No active period found')
            }

            const { data: transaction, error: txError } =
                await transactionsService.create({
                    pay_period_id: period.id,
                    account_id: input.account_id,
                    category_id: input.category_id,
                    type: 'expense',
                    amount: input.actual_price,
                    note: `Buy from wishlist: ${item.name}`,
                    date: input.date,
                    wish_list_item_id: item.id,
                })

            if (txError || !transaction) {
                throw new Error(txError ?? 'Failed to create transaction')
            }

            const { data, error } = await supabase
                .from('wish_list')
                .update({
                    is_purchased: true,
                    transaction_id: transaction.id,
                })
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
            const { error } = await supabase
                .from('wish_list')
                .delete()
                .eq('id', id)

            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
}
