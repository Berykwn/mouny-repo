import type { Account, Category } from '@/types'

export type FirstStep = 'accounts' | 'categories' | 'period'

export interface FirstStepsState {
    accounts: Account[]
    categories: Category[]
    /** The step to do next. A period needs an account; categories can come later. */
    current: FirstStep
    doneCount: number
}

/** Where a new user is in setting up, from what they've already made. */
export function firstStepsState(accounts: Account[], categories: Category[]): FirstStepsState {
    const hasAccounts = accounts.length > 0
    const hasCategories = categories.length > 0
    const current: FirstStep = !hasAccounts ? 'accounts' : !hasCategories ? 'categories' : 'period'
    return { accounts, categories, current, doneCount: Number(hasAccounts) + Number(hasCategories) }
}
