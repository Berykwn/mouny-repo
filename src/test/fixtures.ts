import type { DebtWithAccount, PayPeriod, TransactionWithDetails, WishListItem } from '@/types'

let seq = 0
const nextId = (prefix: string) => `${prefix}-${++seq}`

type TxOverrides = Partial<Omit<TransactionWithDetails, 'category'>> & {
    category?: Partial<NonNullable<TransactionWithDetails['category']>> | null
}

export function tx({ category, ...overrides }: TxOverrides = {}): TransactionWithDetails {
    const id = overrides.id ?? nextId('tx')
    return {
        id,
        user_id: 'user-1',
        pay_period_id: 'period-1',
        account_id: 'acc-1',
        category_id: category ? category.id ?? 'cat-1' : null,
        type: 'expense',
        amount: 10_000,
        note: null,
        date: '2026-09-15',
        created_at: '2026-09-15T08:00:00Z',
        wish_list_item_id: null,
        transfer_id: null,
        debt_id: null,
        wish_quantity: null,
        account: { id: 'acc-1', name: 'BCA', type: 'bank' },
        category: category
            ? { id: 'cat-1', name: 'Food', color: null, bg_color: null, icon: null, is_savings: false, kind: null, ...category }
            : null,
        ...overrides,
    }
}

export function debt(overrides: Partial<DebtWithAccount> = {}): DebtWithAccount {
    return {
        id: nextId('debt'),
        user_id: 'user-1',
        counterparty: 'Andi',
        type: 'debt',
        status: 'active',
        total_amount: 1_000_000,
        remaining_amount: 1_000_000,
        due_date: null,
        notes: null,
        pay_from_account_id: null,
        created_at: '2026-09-01T00:00:00Z',
        pay_from_account: null,
        ...overrides,
    }
}

export function wish(overrides: Partial<WishListItem> = {}): WishListItem {
    return {
        id: nextId('wish'),
        user_id: 'user-1',
        pay_period_id: 'period-1',
        name: 'Laptop',
        estimated_price: null,
        priority: 'medium',
        notes: null,
        quantity: null,
        unit: null,
        price_per_unit: null,
        saved_amount: 0,
        saved_quantity: 0,
        is_purchased: false,
        target_date: null,
        icon: null,
        transaction_id: null,
        created_at: '2026-09-01T00:00:00Z',
        ...overrides,
    }
}

export function period(overrides: Partial<PayPeriod> = {}): PayPeriod {
    return {
        id: nextId('period'),
        user_id: 'user-1',
        salary_amount: 10_000_000,
        salary_account_id: null,
        start_date: '2026-08-25',
        end_date: null,
        status: 'active',
        closing_balance: null,
        notes: null,
        created_at: '2026-08-25T00:00:00Z',
        ...overrides,
    }
}
