import type { QuickTransactionWithCategory } from '@/types'

/** What a quick amount is called: its label, or its category's name when it has none. */
export function quickName(quick: Pick<QuickTransactionWithCategory, 'label' | 'category'>): string {
    return quick.label?.trim() || quick.category.name
}
