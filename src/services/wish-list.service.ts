import { supabase } from '@/lib/supabase'
import { handleError, type ServiceResult } from './_base'
import type { WishListItem } from '@/types/'
import { transactionsService } from './transactions.service'
import { payPeriodsService } from './pay-periods.service'

export interface WishListAnalysis {
    price: number
    // Affordability
    totalBalance: number
    canAfford: boolean
    shortfall: number               // 0 if affordable, positive if not
    // Salary context
    salaryAmount: number
    percentOfSalary: number         // price / salary * 100
    salaryLabel: string             // human-readable salary context
}

/**
 * Generates a human-readable salary context label:
 * - price < salary      → "X% of income"
 * - price = 100–199%    → "1 income + shortfall Rp X"
 * - price >= 2x income  → "Nx income"
 */
function buildSalaryLabel(price: number, salary: number): string {
    if (salary <= 0) return ''

    const percent = (price / salary) * 100

    if (percent <= 100) {
        return `${Math.round(percent)}% of income`
    }

    const fullSalaries = Math.floor(price / salary)
    const remainder = price - fullSalaries * salary

    if (fullSalaries === 1) {
        // 100–199% — show exact shortfall from 1 salary
        return remainder > 0
            ? `1 income + ${formatShortfall(remainder)} short`
            : '1 income'
    }

    // 2x+ — just show the multiplier
    return `${Math.ceil(price / salary)}x income`
}

function formatShortfall(amount: number): string {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`
    return String(Math.round(amount))
}

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
            if (!user) throw new Error('Not logged in')

            const { data, error } = await supabase
                .from('wish_list')
                .insert({
                    ...input,
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

    async analyze(items: WishListItem[]): Promise<ServiceResult<Record<string, WishListAnalysis>>> {
        try {
            if (items.length === 0) return { data: {}, error: null }

            const [
                { data: accounts, error: accError },
                { data: summary },
            ] = await Promise.all([
                supabase.from('accounts').select('balance'),
                supabase.from('active_period_summary').select('salary_amount').single(),
            ])

            if (accError) throw accError

            const totalBalance = (accounts ?? []).reduce((s, a) => s + Number(a.balance), 0)
            const salaryAmount = Number(summary?.salary_amount ?? 0)

            const result: Record<string, WishListAnalysis> = {}

            for (const item of items) {
                const price = item.estimated_price ?? 0

                const canAfford = totalBalance >= price
                const shortfall = Math.max(0, price - totalBalance)
                const percentOfSalary = salaryAmount > 0 ? Math.round((price / salaryAmount) * 100) : 0
                const salaryLabel = salaryAmount > 0 ? buildSalaryLabel(price, salaryAmount) : ''

                result[item.id] = {
                    price,
                    totalBalance,
                    canAfford,
                    shortfall,
                    salaryAmount,
                    percentOfSalary,
                    salaryLabel,
                }
            }

            return { data: result, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
}