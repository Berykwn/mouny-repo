import HandArrowDownIcon from '~icons/ph/hand-arrow-down-duotone'
import HandArrowUpIcon from '~icons/ph/hand-arrow-up-duotone'
import type { DebtType } from '@/types'

interface DebtEmptyProps {
    onAdd: (type: DebtType) => void
    disabled?: boolean
}

const CHOICES: { type: DebtType; title: string; hint: string; Icon: typeof HandArrowDownIcon; tile: string }[] = [
    { type: 'debt', title: 'I borrowed money', hint: 'Someone lent you money', Icon: HandArrowDownIcon, tile: 'bg-negative/10 text-negative' },
    { type: 'receivable', title: 'I lent money', hint: 'Someone owes you', Icon: HandArrowUpIcon, tile: 'bg-positive/10 text-positive' },
]

export function DebtEmpty({ onAdd, disabled }: DebtEmptyProps) {
    return (
        <div className="card p-6 text-center">
            <p className="text-[16px] font-medium tracking-[-0.01em] text-ink">Keep money between people clear</p>
            <p className="mt-1 text-[12px] text-muted-ink leading-relaxed max-w-[300px] mx-auto">
                Note who you owe and who owes you. Mouny keeps the running balance and reminds you when something’s due.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5 text-left">
                {CHOICES.map(({ type, title, hint, Icon, tile }) => (
                    <button
                        key={type}
                        type="button"
                        disabled={disabled}
                        onClick={() => onAdd(type)}
                        className="rounded-[16px] border border-line bg-surface p-3.5 transition-colors hover:bg-surface-soft active:bg-surface-hover disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${tile}`}>
                            <Icon className="w-[22px] h-[22px]" />
                        </div>
                        <p className="mt-3 text-[13px] font-medium text-ink">{title}</p>
                        <p className="text-[11px] text-muted-ink mt-0.5">{hint}</p>
                    </button>
                ))}
            </div>

            {disabled && (
                <p className="mt-4 text-[11.5px] text-muted-ink">Open a pay period to start tracking debts.</p>
            )}
        </div>
    )
}
