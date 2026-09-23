import { supabase } from '@/lib/supabase'
import { handleError, type ServiceResult } from './_base'
import type { CategoryBudget } from '@/types/'

export const categoryBudgetsService = {
    async getAll(): Promise<ServiceResult<CategoryBudget[]>> {
        try {
            const { data, error } = await supabase
                .from('category_budgets')
                .select('*')

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async upsert(categoryId: string, amount: number): Promise<ServiceResult<CategoryBudget>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Belum login')

            const { data, error } = await supabase
                .from('category_budgets')
                .upsert(
                    { user_id: user.id, category_id: categoryId, amount },
                    { onConflict: 'user_id,category_id' }
                )
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async remove(categoryId: string): Promise<ServiceResult<null>> {
        try {
            const { error } = await supabase
                .from('category_budgets')
                .delete()
                .eq('category_id', categoryId)

            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
}
