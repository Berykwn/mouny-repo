import { Coffee, PiggyBank, Receipt, Sparkles, type LucideIcon } from 'lucide-react'
import type { CategoryKind } from '@/lib/category-kind'

export const CATEGORY_KIND_ICON: Record<CategoryKind, LucideIcon> = {
    fixed: Receipt,
    daily: Coffee,
    lifestyle: Sparkles,
    savings: PiggyBank,
}
