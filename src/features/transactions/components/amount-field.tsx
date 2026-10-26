import type { KeyboardEvent, Ref } from 'react'
import { formatCurrencyInput } from '@/lib/helpers'

interface AmountFieldProps {
    id: string
    value: string
    onChange: (digits: string) => void
    disabled?: boolean
    inputRef?: Ref<HTMLInputElement>
    /** Enter on the amount moves on to the note rather than saving half an entry. */
    onNext?: () => void
}

/** The big "Rp 38.000" at the top of the form. Whole rupiah: digits only. */
export function AmountField({ id, value, onChange, disabled, inputRef, onNext }: AmountFieldProps) {
    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter' || !onNext) return
        e.preventDefault()
        onNext()
    }

    return (
        <div>
            <label htmlFor={id} className="sr-only lg:not-sr-only lg:block lg:mb-1.5 text-[12px] font-medium text-muted-ink">Amount</label>
            <div className="flex items-baseline gap-2">
                <span aria-hidden="true" className="text-[22px] font-medium text-muted-ink">Rp</span>
                <input
                    id={id}
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="next"
                    autoComplete="off"
                    value={formatCurrencyInput(value)}
                    onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    onKeyDown={onKeyDown}
                    placeholder="0"
                    disabled={disabled}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[40px] font-semibold tracking-[-0.03em] leading-tight tabular-nums text-ink placeholder:text-faint-ink disabled:opacity-60"
                />
            </div>
        </div>
    )
}
