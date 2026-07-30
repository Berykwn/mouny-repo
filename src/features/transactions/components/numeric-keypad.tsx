import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumericKeypadProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    maxDigits?: number
}

const KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['000', '0', 'backspace'],
] as const

const KEY_BASE = cn(
    'h-16 rounded-[14px] flex items-center justify-center select-none bg-transparent',
    'transition-[transform,background-color] duration-100 ease-out',
    'active:scale-95 active:bg-[#f4f4f2]',
    'disabled:opacity-40 disabled:pointer-events-none'
)

export function NumericKeypad({ value, onChange, disabled, maxDigits = 12 }: NumericKeypadProps) {
    const append = (digits: string) => {
        if (value.length >= maxDigits) return
        onChange((value + digits).slice(0, maxDigits))
    }

    const backspace = () => onChange(value.slice(0, -1))

    return (
        <div className="grid grid-cols-3 gap-3">
            {KEYS.flat().map((key, i) => {
                if (key === 'backspace') {
                    return (
                        <button
                            key={i}
                            type="button"
                            disabled={disabled}
                            onClick={backspace}
                            aria-label="Backspace"
                            className={cn(KEY_BASE, 'text-[#8a8a84]')}
                        >
                            <Delete className="w-5 h-5" strokeWidth={1.75} />
                        </button>
                    )
                }

                return (
                    <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        onClick={() => append(key)}
                        className={cn(
                            KEY_BASE,
                            'font-medium text-[#252525]',
                            key === '000' ? 'text-[20px] tracking-[-0.01em]' : 'text-[24px]'
                        )}
                    >
                        {key}
                    </button>
                )
            })}
        </div>
    )
}
