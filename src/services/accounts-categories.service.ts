import { supabase } from '@/lib/supabase'
import { handleError, invalidatesOnWrite, sessionUser, type ServiceResult, SIGNED_OUT_MESSAGE } from './_base'
import type { Account } from '@/types/'
import type { Category } from '@/types/'
import { COLORS } from '@/lib/static-colors'
import { ICON_MAP } from '@/lib/icon-map'
import type { CategoryKind } from '@/lib/category-kind'

type CategoryInput = Omit<Category, 'id' | 'user_id' | 'created_at' | 'bg_color' | 'is_savings' | 'kind'> & { bg_color?: string | null; is_savings?: boolean; kind?: CategoryKind | null }

function needsIconRepair(c: Category): boolean {
    return !c.icon || !(c.icon in ICON_MAP)
}

// Categories created before icon selection existed (or edited outside the app) can carry a
// null/stale icon value. Backfill a sensible default and persist it so every other read path
// (transaction joins, category grids, etc.) sees a real icon from then on.
async function repairMissingIcons(categories: Category[]): Promise<Category[]> {
    const broken = categories.filter(needsIconRepair)
    if (broken.length === 0) return categories

    const fixed = await Promise.all(broken.map(async (c) => {
        const icon = c.type === 'income' ? 'wallet' : 'shopping-bag'
        const { data } = await supabase.from('categories').update({ icon }).eq('id', c.id).select().single()
        return data ?? { ...c, icon }
    }))

    const byId = new Map(fixed.map(c => [c.id, c]))
    return categories.map(c => byId.get(c.id) ?? c)
}

export const accountsService = invalidatesOnWrite({
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
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

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

            const { error } = await supabase.rpc('transfer_balance', {
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
})

export const categoriesService = invalidatesOnWrite({
    async getAll(): Promise<ServiceResult<Category[]>> {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name')

            if (error) throw error
            return { data: await repairMissingIcons(data), error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async create(input: CategoryInput): Promise<ServiceResult<Category>> {
        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

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

    async update(id: string, input: { name: string; type: Category['type']; color: string; bg_color: string | null; icon?: string | null; is_savings?: boolean; kind?: CategoryKind | null }): Promise<ServiceResult<Category>> {
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
        const defaults: CategoryInput[] = [
            // INCOME
            { name: 'Salary', type: 'income', color: COLORS[4], icon: 'wallet' },
            { name: 'Freelance', type: 'income', color: COLORS[6], icon: 'briefcase' },
            { name: 'Business Income', type: 'income', color: COLORS[5], icon: 'building' },
            { name: 'Investment Return', type: 'income', color: COLORS[5], icon: 'trending-up' },
            { name: 'Bonus', type: 'income', color: COLORS[3], icon: 'gift' },
            { name: 'Side Hustle', type: 'income', color: COLORS[1], icon: 'plus-circle' },
            { name: 'Other Income', type: 'income', color: COLORS[2], icon: 'more-horizontal' },

            // FIXED EXPENSE
            { name: 'Rent', type: 'expense', color: COLORS[0], icon: 'home', kind: 'fixed' },
            { name: 'Utilities', type: 'expense', color: COLORS[1], icon: 'zap', kind: 'fixed' },
            { name: 'Internet', type: 'expense', color: COLORS[2], icon: 'wifi', kind: 'fixed' },
            { name: 'Insurance', type: 'expense', color: COLORS[0], icon: 'shield', kind: 'fixed' },
            { name: 'Loan Payment', type: 'expense', color: COLORS[0], icon: 'credit-card', kind: 'fixed' },

            // DAILY EXPENSE
            { name: 'Food & Drinks', type: 'expense', color: COLORS[3], icon: 'utensils', kind: 'daily' },
            { name: 'Groceries', type: 'expense', color: COLORS[3], icon: 'shopping-cart', kind: 'daily' },
            { name: 'Transportation', type: 'expense', color: COLORS[10], icon: 'car', kind: 'daily' },
            { name: 'Fuel', type: 'expense', color: COLORS[12], icon: 'truck', kind: 'daily' },

            // LIFESTYLE
            { name: 'Shopping', type: 'expense', color: COLORS[13], icon: 'shopping-bag', kind: 'lifestyle' },
            { name: 'Entertainment', type: 'expense', color: COLORS[15], icon: 'film', kind: 'lifestyle' },
            { name: 'Travel', type: 'expense', color: COLORS[11], icon: 'plane', kind: 'lifestyle' },
            { name: 'Subscriptions', type: 'expense', color: COLORS[14], icon: 'repeat', kind: 'fixed' },

            // PERSONAL
            { name: 'Health', type: 'expense', color: COLORS[16], icon: 'heart', kind: 'daily' },
            { name: 'Education', type: 'expense', color: COLORS[9], icon: 'book', kind: 'fixed' },
            { name: 'Gifts & Donations', type: 'expense', color: COLORS[16], icon: 'gift', kind: 'lifestyle' },

            // FINANCIAL
            { name: 'Debt Payment', type: 'expense', color: COLORS[18], icon: 'arrow-down-circle', kind: 'fixed' },
            { name: 'Savings', type: 'expense', color: COLORS[4], icon: 'piggy-bank', is_savings: true, kind: 'savings' },
            { name: 'Investments', type: 'expense', color: COLORS[5], icon: 'trending-up', is_savings: true, kind: 'savings' },

            // OTHER
            { name: 'Miscellaneous', type: 'expense', color: COLORS[19], icon: 'more-horizontal', kind: 'daily' },
        ]

        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

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
})