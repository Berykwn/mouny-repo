import { supabase } from '@/lib/supabase'
import { handleError, invalidatesOnWrite, isMissingFunction, NULL_ARG, sessionUser, type ServiceResult, SIGNED_OUT_MESSAGE } from './_base'
import type { Account, Debt, DebtPayment, DebtWithAccount, Category } from '@/types/'
import { COLORS } from '@/lib/static-colors'

// A bill for the pace: paid once a period, never a daily habit. Money lent, borrowed and
// collected has no category: it's a transfer, not spending or income.
const DEBT_CATEGORIES: Record<string, { type: 'income' | 'expense'; color: string; icon: string; kind: 'fixed' }> = {
    'Debt Payment': { type: 'expense', color: COLORS[18] ?? '#6b7280', icon: 'arrow-down-circle', kind: 'fixed' },
}

export type DebtPaymentWithAccount = DebtPayment & {
    account: { id: string; name: string } | null
}

export interface DebtEditInput {
    counterparty: string
    total_amount: number
    due_date: string | null
    notes: string | null
}

/**
 * For a database without create_debt yet: the debt, then its transfer. If the transfer
 * fails the debt is removed again, so it isn't left without its money.
 */
async function createInSteps(input: Parameters<typeof debtsService.create>[0]): Promise<ServiceResult<Debt>> {
    const user = await sessionUser()
    if (!user) throw new Error(SIGNED_OUT_MESSAGE)

    const { data: debt, error } = await supabase
        .from('debts')
        .insert({
            user_id: user.id,
            type: input.type,
            counterparty: input.counterparty,
            total_amount: input.total_amount,
            remaining_amount: input.total_amount,
            due_date: input.due_date,
            pay_from_account_id: input.account_id,
            status: 'active',
            notes: input.notes,
        })
        .select()
        .single()
    if (error) throw error

    if (input.moved && input.account_id) {
        const { error: txError } = await supabase.from('transactions').insert({
            user_id: user.id,
            pay_period_id: input.moved.pay_period_id,
            account_id: input.account_id,
            type: input.type === 'debt' ? 'transfer_in' : 'transfer_out',
            amount: input.total_amount,
            note: `${input.type === 'debt' ? 'Debt received' : 'Lent to'} — ${input.counterparty}`,
            date: input.moved.date,
            debt_id: debt.id,
        })
        if (txError) {
            await supabase.from('debts').delete().eq('id', debt.id)
            throw txError
        }
    }
    return { data: debt, error: null }
}

export const debtsService = invalidatesOnWrite({
    async findOrCreateCategory(name: 'Debt Payment'): Promise<ServiceResult<Category>> {
        try {
            const user = await sessionUser()
            if (!user) throw new Error(SIGNED_OUT_MESSAGE)

            const meta = DEBT_CATEGORIES[name]
            // Match on type too, and take the oldest if there are several — a second
            // category with the same name must not make every debt payment fail.
            const { data: existing, error: findError } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .eq('name', name)
                .eq('type', meta.type)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle()

            if (findError) throw findError
            if (existing) return { data: existing, error: null }

            const { data, error } = await supabase
                .from('categories')
                .insert({ user_id: user.id, name, ...meta })
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async getAll(): Promise<ServiceResult<DebtWithAccount[]>> {
        try {
            const { data, error } = await supabase
                .from('debts')
                .select(`
                *,
                pay_from_account:accounts(
                    id,
                    name,
                    balance,
                    type
                )
            `)
                .order('due_date', { ascending: true, nullsFirst: false })

            if (error) throw error

            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * Record a debt or receivable and, when money actually changed hands, its transfer
     * (borrowed money in, lent money out), in one database transaction: if the transfer
     * fails (say the account is short), no debt is left behind.
     */
    async create(input: {
        type: 'debt' | 'receivable'
        counterparty: string
        total_amount: number
        due_date: string | null
        notes: string | null
        account_id: string | null
        /** The money moved through account_id on `date`, in the period. */
        moved: { date: string; pay_period_id: string } | null
    }): Promise<ServiceResult<Debt>> {
        try {
            const { data, error } = await supabase.rpc('create_debt', {
                p_type: input.type,
                p_counterparty: input.counterparty,
                p_total_amount: input.total_amount,
                p_due_date: input.due_date ?? NULL_ARG,
                p_notes: input.notes ?? NULL_ARG,
                p_account_id: input.account_id ?? NULL_ARG,
                p_moves_money: !!input.moved,
                p_date: input.moved?.date ?? NULL_ARG,
                p_pay_period_id: input.moved?.pay_period_id ?? NULL_ARG,
            })
            if (!isMissingFunction(error)) {
                if (error) throw error
                return { data, error: null }
            }
            return await createInSteps(input)
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * Pay a debt from an account: an expense linked to the debt and the history row, in
     * one database transaction. The database lowers the remaining amount from the
     * history row, and puts it back if the expense is deleted later.
     */
    async pay(input: {
        debt_id: string
        amount: number
        account_id: string
        date: string
        pay_period_id: string
        category_id: string
        note: string
    }): Promise<ServiceResult<Debt>> {
        try {
            const { data, error } = await supabase.rpc('pay_debt', {
                p_debt_id: input.debt_id,
                p_amount: input.amount,
                p_account_id: input.account_id,
                p_date: input.date,
                p_pay_period_id: input.pay_period_id,
                p_category_id: input.category_id,
                p_note: input.note,
            })
            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * Collect on a receivable into an account: money back in (a transfer, not income)
     * linked to the debt, and the history row, in one database transaction.
     */
    async collect(input: { debt_id: string; amount: number; account: Account; date: string }): Promise<ServiceResult<Debt>> {
        try {
            const { data, error } = await supabase.rpc('collect_receivable', {
                p_debt_id: input.debt_id,
                p_amount: input.amount,
                p_account_id: input.account.id,
                p_date: input.date,
            })
            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    /**
     * Edit a debt's details. Changing the total keeps what's already been paid: the
     * remaining amount moves by the same difference (never below zero). The database
     * works that out again on the locked row (debts_amounts), so a payment made between
     * the read and the write here isn't lost; what's sent covers a database without it.
     */
    async update(id: string, input: DebtEditInput): Promise<ServiceResult<Debt>> {
        try {
            const { data: debt, error: fetchError } = await supabase
                .from('debts')
                .select('remaining_amount, total_amount')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            const paid = debt.total_amount - debt.remaining_amount
            const remaining = Math.max(0, input.total_amount - paid)

            const { data, error } = await supabase
                .from('debts')
                .update({ ...input, remaining_amount: remaining, status: remaining === 0 ? 'paid' : 'active' })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async getPayments(debtId: string): Promise<ServiceResult<DebtPaymentWithAccount[]>> {
        try {
            const { data, error } = await supabase
                .from('debt_payments')
                .select('*, account:accounts(id, name)')
                .eq('debt_id', debtId)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error
            return { data, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },

    async remove(id: string): Promise<ServiceResult<null>> {
        try {
            const { error } = await supabase.from('debts').delete().eq('id', id)
            if (error) throw error
            return { data: null, error: null }
        } catch (err) {
            return { data: null, error: handleError(err) }
        }
    },
})