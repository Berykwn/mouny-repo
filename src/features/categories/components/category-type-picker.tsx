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
    selectedBorder: string
    selectedBg: string
    iconBg: string
    iconColor: string
    checkBg: string
}> = {
    expense: {
        label: 'Expense',
        sub: 'Food, transport...',
        icon: TrendingDown,
        selectedBorder: 'border-yellow-400',
        selectedBg: 'bg-yellow-50',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-500',
        checkBg: 'bg-yellow-500',
    },
    income: {
        label: 'Income',
        sub: 'Salary, freelance...',
        icon: TrendingUp,
        selectedBorder: 'border-emerald-400',
        selectedBg: 'bg-emerald-50',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-500',
        checkBg: 'bg-emerald-500',
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
                            'relative flex flex-1 items-center gap-2.5 rounded-xl border-[1.5px] p-3 text-left transition-all duration-150',
                            isSelected
                                ? `${config.selectedBorder} ${config.selectedBg}`
                                : 'border-border bg-background hover:bg-muted/50'
                        )}
                    >
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', config.iconBg)}>
                            <Icon className={cn('h-5 w-5', config.iconColor)} />
                        </div>
                        <div>
                            <p className="text-sm font-medium leading-tight text-foreground">{config.label}</p>
                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{config.sub}</p>
                        </div>
                        {isSelected && (
                            <div className={cn('absolute right-2 top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full', config.checkBg)}>
                                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                            </div>
                        )}
                    </button>
                )
            })}
        </div>
    )
}