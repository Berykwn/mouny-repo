import { supabase } from '@/lib/supabase'
import { handleError, invalidatesOnWrite, sessionUser, isMissingFunction, NULL_ARG, type ServiceResult, SIGNED_OUT_MESSAGE } from './_base'
import type { WishListItem, WishPart } from '@/types/'

export type WishListPurchased = WishListItem & {
    purchase: { date: string; amount: number } | null
}
import { transactionsService } from './transactions.service'
import { payPeriodsService } from './pay-periods.service'

/**
 * True when wish_parts isn't there, i.e. its migration hasn't been run: PostgREST can't
 * embed it (PGRST200) or find it (PGRST205), or Postgres has no such table (42P01).
 */
const isMissingParts = (error: { code?: string } | null) =>
    error?.code === 'PGRST200' || error?.code === 'PGRST205' || error?.code === '42P01'

/** Parts in the order they were listed. */
function withSortedParts<T extends WishListItem>(items: T[]): T[] {
    for (const item of items) {
        item.parts?.sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
    }
    return items
}

const PARTS_MIGRATION_MESSAGE = 'Splitting a wish needs the latest database update (wish_parts migration).'

export const wishListService = invalidatesOnWrite({
    async getAll(): Promise<ServiceResult<WishListItem[]>> {
        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

            const query = (select: string) => supabase
                .from('wish_list')
                .select(select)
                .eq('user_id', user.id)
                .eq('is_purchased', false)
                .order('created_at', { ascending: false })

            let { data, error } = await query('*, parts:wish_parts(*)')
            // Before the wish_parts migration, wishes still load, just without parts.
            if (isMissingParts(error)) ({ data, error } = await query('*'))

            if (error) throw error
            return { data: withSortedParts((data ?? []) as unknown as WishListItem[]), error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /** Wishes already bought, newest first, with the purchase transaction's date and amount. */
    async getPurchased(limit = 20): Promise<ServiceResult<WishListPurchased[]>> {
        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

            const query = (select: string) => supabase
                .from('wish_list')
                .select(select)
                .eq('user_id', user.id)
                .eq('is_purchased', true)
                .order('created_at', { ascending: false })
                .limit(limit)

            // transactions links to wish_list twice, so name the FK to embed through.
            const purchase = 'purchase:transactions!wish_list_transaction_id_fkey(date, amount)'
            let { data, error } = await query(`*, ${purchase}, parts:wish_parts(*)`)
            if (isMissingParts(error)) ({ data, error } = await query(`*, ${purchase}`))

            if (error) throw error
            return { data: withSortedParts((data ?? []) as unknown as WishListPurchased[]), error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * Save a wish's parts as listed, all or nothing: new ones (no id) are added, listed
     * ones updated, and open parts left off the list removed. Bought parts aren't touched;
     * leaving nothing to buy once some are bought finishes the wish.
     */
    async saveParts(item: WishListItem, parts: { id?: string; name: string; estimated_price: number | null }[]): Promise<ServiceResult<WishListItem>> {
        try {
            const { data, error } = await supabase.rpc('save_wish_parts', {
                p_wish_id: item.id,
                p_parts: parts.map(p => ({ id: p.id ?? null, name: p.name.trim(), estimated_price: p.estimated_price })),
            })
            if (isMissingFunction(error)) throw new Error(PARTS_MIGRATION_MESSAGE)
            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * Buy one part of a split wish. Recorded, it's an expense linked to the wish; not
     * recorded, the part is only marked bought (it was paid for before being tracked).
     */
    async buyPart(
        item: WishListItem,
        part: WishPart,
        input:
            | { record: true; amount: number; account_id: string; category_id?: string; date: string }
            | { record: false; amount: number; date: string },
    ): Promise<ServiceResult<WishListItem>> {
        try {
            let periodId = NULL_ARG
            if (input.record) {
                const { data: period, error: periodError } = await payPeriodsService.getActive()
                if (periodError || !period) throw new Error('No active period found')
                periodId = period.id
            }

            const { data, error } = await supabase.rpc('buy_wish_part', {
                p_part_id: part.id,
                p_amount: input.amount,
                p_record: input.record,
                p_account_id: input.record ? input.account_id : NULL_ARG,
                p_category_id: (input.record && input.category_id) || NULL_ARG,
                p_date: input.date,
                p_pay_period_id: periodId,
                p_note: `Buy from wishlist: ${item.name} — ${part.name}`,
            })
            if (isMissingFunction(error)) throw new Error(PARTS_MIGRATION_MESSAGE)
            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /** Undo a part's purchase; a recorded one's expense is deleted with it. */
    async undoPart(part: WishPart): Promise<ServiceResult<WishListItem>> {
        try {
            const { data, error } = await supabase.rpc('undo_wish_part', { p_part_id: part.id })
            if (isMissingFunction(error)) throw new Error(PARTS_MIGRATION_MESSAGE)
            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async create(input: {
        pay_period_id: string
        name: string
        estimated_price?: number | null
        priority?: WishListItem['priority']
        notes?: string | null
        quantity?: number | null
        unit?: string | null
        price_per_unit?: number | null
        target_date?: string | null
        icon?: string | null
    }): Promise<ServiceResult<WishListItem>> {
        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

            const estimated_price = input.quantity && input.price_per_unit
                ? Math.round(input.quantity * input.price_per_unit)
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
        estimated_price?: number | null
        priority?: WishListItem['priority']
        notes?: string | null
        quantity?: number | null
        unit?: string | null
        price_per_unit?: number | null
        target_date?: string | null
        icon?: string | null
    }): Promise<ServiceResult<WishListItem>> {
        try {
            const estimated_price = input.quantity && input.price_per_unit
                ? Math.round(input.quantity * input.price_per_unit)
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

            // One UPDATE in the database, so two contributions at once both count.
            const { data: updated, error: rpcError } = await supabase.rpc('contribute_wish', { p_id: id, p_amount: amount })
            if (!isMissingFunction(rpcError)) {
                if (rpcError) throw rpcError
                return { data: updated, error: null }
            }

            // No RPC yet: read, add, write.
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

            // Decimal quantities (0.7 + 0.1 gram) drift in floating point and would never
            // reach the target, so work in a fixed 3-decimal precision.
            const roundQty = (n: number) => Math.round(n * 1000) / 1000
            const quantity = roundQty(input.quantity)
            const savedQuantity = roundQty(item.saved_quantity ?? 0)
            if (item.quantity && roundQty(savedQuantity + quantity) > roundQty(item.quantity)) {
                throw new Error(`Only ${roundQty(item.quantity - savedQuantity)} ${item.unit ?? ''} left to reach the target.`)
            }

            const { data: period, error: periodError } =
                await payPeriodsService.getActive()

            if (periodError || !period) {
                throw new Error('No active period found')
            }

            // Rupiah has no fractions; 0.5 × an odd price would otherwise be a half rupiah.
            const amount = Math.round(quantity * input.price_per_unit)
            const note = `Cicilan: ${item.name}`

            // The installment and the wish's progress in one database transaction.
            const { data: updated, error: rpcError } = await supabase.rpc('contribute_wish_quantity', {
                p_wish_id: item.id,
                p_quantity: quantity,
                p_amount: amount,
                p_account_id: input.account_id,
                p_category_id: input.category_id ?? NULL_ARG,
                p_date: input.date,
                p_pay_period_id: period.id,
                p_note: note,
            })
            if (!isMissingFunction(rpcError)) {
                if (rpcError) throw rpcError
                return { data: updated, error: null }
            }

            // No RPC yet: the transaction, then the wish.
            const { data: transaction, error: txError } =
                await transactionsService.create({
                    pay_period_id: period.id,
                    account_id: input.account_id,
                    category_id: input.category_id,
                    type: 'expense',
                    amount,
                    note,
                    date: input.date,
                    wish_list_item_id: item.id,
                })

            if (txError || !transaction) {
                throw new Error(txError ?? 'Failed to create transaction')
            }

            const newSavedQuantity = roundQty(savedQuantity + quantity)
            const newSavedAmount = (item.saved_amount ?? 0) + amount
            const isComplete = !!item.quantity && newSavedQuantity >= roundQty(item.quantity)

            const { data, error } = await supabase
                .from('wish_list')
                .update({
                    saved_quantity: newSavedQuantity,
                    saved_amount: newSavedAmount,
                    is_purchased: isComplete,
                    // Link the installment that completed the goal, as markAsPurchased does.
                    ...(isComplete ? { transaction_id: transaction.id } : {}),
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
            const note = `Buy from wishlist: ${item.name}`

            // The purchase and marking the wish bought in one database transaction.
            const { data: updated, error: rpcError } = await supabase.rpc('buy_wish', {
                p_wish_id: item.id,
                p_amount: input.actual_price,
                p_account_id: input.account_id,
                p_category_id: input.category_id ?? NULL_ARG,
                p_date: input.date,
                p_pay_period_id: period.id,
                p_note: note,
            })
            if (!isMissingFunction(rpcError)) {
                if (rpcError) throw rpcError
                return { data: updated, error: null }
            }

            // No RPC yet: the transaction, then the wish.
            const { data: transaction, error: txError } =
                await transactionsService.create({
                    pay_period_id: period.id,
                    account_id: input.account_id,
                    category_id: input.category_id,
                    type: 'expense',
                    amount: input.actual_price,
                    note,
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
})
