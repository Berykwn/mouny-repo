import { Check, LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CategoryType } from '@/types'

interface CategoryTypePickerProps {
    value: CategoryType
    onChange: (type: CategoryType) => void
}

const typeConfig: Record<CategoryType, {
    label: string
    sub: string
    icon: LucideIcon
    tone: 'positive' | 'negative'
}> = {
    expense: {
        label: 'Expense',
        sub: 'Food, transport...',
        icon: TrendingDown,
        tone: 'negative',
    },
    income: {
        label: 'Income',
        sub: 'Salary, freelance...',
        icon: TrendingUp,
        tone: 'positive',
    },
}

export const categoryTypeConfig = typeConfig

export function CategoryTypePicker({ value, onChange }: CategoryTypePickerProps) {
    return (
        <div className="flex gap-2.5">
            {(['expense', 'income'] as CategoryType[]).map((t) => {
                const config = typeConfig[t]
                const Icon = config.icon
                const isSelected = value === t
                const positive = config.tone === 'positive'

                return (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onChange(t)}
                        className={cn(
                            'relative flex flex-1 items-center gap-2.5 rounded-[14px] border-[1.5px] p-3 text-left transition-all duration-150',
                            isSelected
                                ? positive
                                    ? 'border-positive bg-positive/10'
                                    : 'border-negative bg-negative/10'
                                : 'border-line bg-white hover:border-[#d4d4d4]'
                        )}
                    >
                        <div className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
                            isSelected ? (positive ? 'bg-positive/15' : 'bg-negative/15') : 'bg-surface-hover'
                        )}>
                            <Icon className={cn('h-5 w-5', isSelected ? (positive ? 'text-positive' : 'text-negative') : 'text-muted-ink')} />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium leading-tight text-ink">{config.label}</p>
                            <p className={cn('mt-0.5 text-[11px] leading-snug', isSelected ? (positive ? 'text-positive' : 'text-negative') : 'text-muted-ink')}>{config.sub}</p>
                        </div>
                        {isSelected && (
                            <div className={cn('absolute right-2 top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full', positive ? 'bg-positive' : 'bg-negative')}>
                                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                            </div>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
