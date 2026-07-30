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
}> = {
    expense: {
        label: 'Expense',
        sub: 'Food, transport...',
        icon: TrendingDown,
    },
    income: {
        label: 'Income',
        sub: 'Salary, freelance...',
        icon: TrendingUp,
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

                return (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onChange(t)}
                        className={cn(
                            'relative flex flex-1 items-center gap-2.5 rounded-[14px] border-[1.5px] p-3 text-left transition-all duration-150',
                            isSelected
                                ? 'border-[#6FA82B] bg-[#f2f6ea]'
                                : 'border-[#e5e5e5] bg-white hover:border-[#d4d4d4]'
                        )}
                    >
                        <div className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
                            isSelected ? 'bg-[#6FA82B]/15' : 'bg-[#f4f4f2]'
                        )}>
                            <Icon className={cn('h-5 w-5', isSelected ? 'text-[#4d7a1d]' : 'text-[#8a8a84]')} />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium leading-tight text-[#252525]">{config.label}</p>
                            <p className={cn('mt-0.5 text-[11px] leading-snug', isSelected ? 'text-[#4d7a1d]' : 'text-[#8a8a84]')}>{config.sub}</p>
                        </div>
                        {isSelected && (
                            <div className="absolute right-2 top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#6FA82B]">
                                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                            </div>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
