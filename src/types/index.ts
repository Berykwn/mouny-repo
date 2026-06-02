import type { Database } from './database.types'

export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']

export type PayPeriod = Database['public']['Tables']['pay_periods']['Row']
export type PayPeriodInsert = Database['public']['Tables']['pay_periods']['Insert']
export type PayPeriodUpdate = Database['public']['Tables']['pay_periods']['Update']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type Debt = Database['public']['Tables']['debts']['Row']
export type DebtInsert = Database['public']['Tables']['debts']['Insert']
export type DebtUpdate = Database['public']['Tables']['debts']['Update']

export type WishListItem = Database['public']['Tables']['wish_list']['Row']
export type WishListInsert = Database['public']['Tables']['wish_list']['Insert']
export type WishListUpdate = Database['public']['Tables']['wish_list']['Update']

export type AccountType = 'bank' | 'cash'
export type CategoryType = 'income' | 'expense'
export type TransactionType = 'income' | 'expense'
export type PayPeriodStatus = 'active' | 'closed'
export type DebtType = 'debt' | 'receivable'
export type DebtStatus = 'active' | 'paid'
export type WishListPriority = 'low' | 'medium' | 'high'

export type TransactionWithDetails = Transaction & {
    account: Pick<Account, 'id' | 'name' | 'type'>
    category: Pick<Category, 'id' | 'name' | 'color' | 'icon'> | null
}

export type DebtWithAccount = Debt & {
    pay_from_account: Pick<Account, 'id' | 'name' | 'type' | 'balance'> | null
}