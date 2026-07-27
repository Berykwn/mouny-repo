import { supabase } from '@/lib/supabase'
import { handleError, type ServiceResult } from './_base'
import type { Account } from '@/types/'
import type { Category } from '@/types/'
import { COLORS } from '@/lib/static-colors'

export const accountsService = {
    async getAll(): Promise<ServiceResult<Account[]>> {
        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .order('name')

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async create(input: { name: string; type: Account['type']; initial_balance: number }): Promise<ServiceResult<Account>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Belum login')

            const { data, error } = await supabase
                .from('accounts')
                .insert({ ...input, user_id: user.id, balance: input.initial_balance })
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async update(id: string, input: { name: string; type: Account['type']; balance_adjustment?: number }): Promise<ServiceResult<Account>> {
        try {
            const { data: current, error: fetchError } = await supabase
                .from('accounts')
                .select('balance')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            const { data, error } = await supabase
                .from('accounts')
                .update({
                    name: input.name,
                    type: input.type,
                    ...(input.balance_adjustment !== undefined && input.balance_adjustment !== 0
                        ? { balance: current.balance + input.balance_adjustment }
                        : {}
                    ),
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

    async remove(id: string): Promise<ServiceResult<null>> {
        try {
            const { error } = await supabase.from('accounts').delete().eq('id', id)
            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async transfer(fromId: string, toId: string, amount: number): Promise<ServiceResult<null>> {
        try {
            const { data: accounts, error: fetchError } = await supabase
                .from('accounts')
                .select('id, balance')
                .in('id', [fromId, toId])

            if (fetchError) throw fetchError

            const from = accounts.find(a => a.id === fromId)
            const to = accounts.find(a => a.id === toId)

            if (!from || !to) throw new Error('Account not found')
            if (from.balance < amount) throw new Error('Insufficient balance')

            // `transfer_balance` isn't in database.types.ts yet (Functions wasn't regenerated
            // after this RPC was added in Supabase) — cast narrowly instead of `as any`.
            const { error } = await (supabase as unknown as {
                rpc: (
                    fn: 'transfer_balance',
                    params: { p_from_id: string; p_to_id: string; p_amount: number }
                ) => PromiseLike<{ error: { message: string } | null }>
            }).rpc('transfer_balance', {
                p_from_id: fromId,
                p_to_id: toId,
                p_amount: amount,
            })

            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
}

export const categoriesService = {
    async getAll(): Promise<ServiceResult<Category[]>> {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name')

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async getByType(type: Category['type']): Promise<ServiceResult<Category[]>> {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('type', type)
                .order('name')

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async create(input: Omit<Category, 'id' | 'user_id' | 'created_at'>): Promise<ServiceResult<Category>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('unauthenticated')

            const { data, error } = await supabase
                .from('categories')
                .insert({ ...input, user_id: user.id })
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async update(id: string, input: { name: string; type: Category['type']; color: string; icon?: string | null }): Promise<ServiceResult<Category>> {
        try {
            const { data, error } = await supabase
                .from('categories')
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
            const { error } = await supabase.from('categories').delete().eq('id', id)
            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async seedDefaults(): Promise<ServiceResult<Category[]>> {
        const defaults: Omit<Category, 'id' | 'user_id' | 'created_at'>[] = [
            // INCOME
            { name: 'Salary', type: 'income', color: COLORS[4], icon: 'wallet' },
            { name: 'Freelance', type: 'income', color: COLORS[6], icon: 'briefcase' },
            { name: 'Business Income', type: 'income', color: COLORS[5], icon: 'building' },
            { name: 'Investment Return', type: 'income', color: COLORS[5], icon: 'trending-up' },
            { name: 'Bonus', type: 'income', color: COLORS[3], icon: 'gift' },
            { name: 'Side Hustle', type: 'income', color: COLORS[1], icon: 'plus-circle' },
            { name: 'Other Income', type: 'income', color: COLORS[2], icon: 'more-horizontal' },

            // FIXED EXPENSE
            { name: 'Rent', type: 'expense', color: COLORS[0], icon: 'home' },
            { name: 'Utilities', type: 'expense', color: COLORS[1], icon: 'zap' },
            { name: 'Internet', type: 'expense', color: COLORS[2], icon: 'wifi' },
            { name: 'Insurance', type: 'expense', color: COLORS[0], icon: 'shield' },
            { name: 'Loan Payment', type: 'expense', color: COLORS[0], icon: 'credit-card' },

            // DAILY EXPENSE
            { name: 'Food & Drinks', type: 'expense', color: COLORS[3], icon: 'utensils' },
            { name: 'Groceries', type: 'expense', color: COLORS[3], icon: 'shopping-cart' },
            { name: 'Transportation', type: 'expense', color: COLORS[10], icon: 'car' },
            { name: 'Fuel', type: 'expense', color: COLORS[12], icon: 'truck' },

            // LIFESTYLE
            { name: 'Shopping', type: 'expense', color: COLORS[13], icon: 'shopping-bag' },
            { name: 'Entertainment', type: 'expense', color: COLORS[15], icon: 'film' },
            { name: 'Travel', type: 'expense', color: COLORS[11], icon: 'plane' },
            { name: 'Subscriptions', type: 'expense', color: COLORS[14], icon: 'repeat' },

            // PERSONAL
            { name: 'Health', type: 'expense', color: COLORS[16], icon: 'heart' },
            { name: 'Education', type: 'expense', color: COLORS[9], icon: 'book' },
            { name: 'Gifts & Donations', type: 'expense', color: COLORS[16], icon: 'gift' },

            // FINANCIAL
            { name: 'Debt Payment', type: 'expense', color: COLORS[18], icon: 'arrow-down-circle' },
            { name: 'Savings', type: 'expense', color: COLORS[4], icon: 'piggy-bank' },
            { name: 'Investments', type: 'expense', color: COLORS[5], icon: 'trending-up' },

            // OTHER
            { name: 'Miscellaneous', type: 'expense', color: COLORS[19], icon: 'more-horizontal' },
        ]

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('unauthenticated')

            const { data, error } = await supabase
                .from('categories')
                .insert(defaults.map(d => ({ ...d, user_id: user.id })))
                .select()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
}