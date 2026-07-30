import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/helpers'
import { NumericKeypad } from './numeric-keypad'

type TxType = 'income' | 'expense'

interface AmountStepProps {
    type: TxType
    amount: string
    onTypeChange: (type: TxType) => void
    onAmountChange: (value: string) => void
    onNext: () => void
    onClose: () => void
}

function amountSizeClass(digitLength: number) {
    if (digitLength >= 13) return 'text-[32px]'
    if (digitLength >= 10) return 'text-[40px]'
    return 'text-[56px]'
}

export function AmountStep({ type, amount, onTypeChange, onAmountChange, onNext, onClose }: AmountStepProps) {
    const parsed = parseCurrencyInput(amount)
    const colorClass = parsed <= 0
        ? 'text-[#a3a3a3]'
        : type === 'income' ? 'text-[#059669]' : 'text-[#dc2626]'

    return (
        <div className="flex flex-col h-full overflow-y-auto min-h-0">
            <div className="flex items-center px-5 pt-3 pb-1 shrink-0">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#8a8a84] hover:bg-[#f4f4f2] active:bg-[#f4f4f2] transition-colors"
                >
                    <X className="w-[18px] h-[18px]" strokeWidth={2} />
                </button>
            </div>

            <div className="flex justify-center px-5 pt-2 pb-4 shrink-0">
                <div className="relative flex w-full max-w-[280px] rounded-[14px] bg-[#f4f4f2] p-1 gap-1">
                    <div
                        className={cn(
                            'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[10px] bg-white shadow-sm transition-transform duration-200 ease-out',
                            type === 'income' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                        )}
                    />
                    {(['expense', 'income'] as TxType[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => onTypeChange(t)}
                            className={cn(
                                'relative z-10 flex-1 py-2 text-[13px] rounded-[10px] transition-colors duration-150',
                                type === t ? 'text-[#252525] font-semibold' : 'text-[#8a8a84] font-medium'
                            )}
                        >
                            {t === 'expense' ? 'Expense' : 'Income'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center px-6">
                <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-[20px] font-medium text-[#8a8a84]">Rp</span>
                    <span className={cn(amountSizeClass(amount.length), 'font-medium tracking-[-0.02em] leading-none', colorClass)}>
                        {formatCurrencyInput(amount) || '0'}
                    </span>
                </div>
            </div>

            <div className="px-5 pb-2 shrink-0">
                <NumericKeypad value={amount} onChange={onAmountChange} />
            </div>

            <div className="px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] shrink-0">
                <button
                    type="button"
                    disabled={parsed <= 0}
                    onClick={onNext}
                    className="w-full h-14 rounded-[14px] text-[15px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                    Next
                </button>
            </div>
        </div>
    )
}
