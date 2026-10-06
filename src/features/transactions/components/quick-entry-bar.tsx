import { useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { formatShortCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { FrequentEntry, QuickEntry } from '../lib/quick-entry'

interface QuickEntryBarProps {
    frequent: FrequentEntry[]
    parse: (text: string) => QuickEntry
    onApply: (entry: QuickEntry) => void
    disabled?: boolean
}

/** Type a line or tap a regular to fill the form; the form still shows it all before Save. */
export function QuickEntryBar({ frequent, parse, onApply, disabled }: QuickEntryBarProps) {
    const [text, setText] = useState('')

    const apply = () => {
        if (!text.trim()) return
        onApply(parse(text))
        setText('')
    }

    return (
        <div className="space-y-2">
            <form
                onSubmit={(e) => { e.preventDefault(); apply() }}
                className="flex items-center gap-2 h-11 pl-3 pr-1.5 rounded-[12px] border border-line bg-surface-soft focus-within:border-ink/30 transition-colors"
            >
                <Sparkles className="w-4 h-4 text-brand shrink-0" strokeWidth={1.9} />
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="makan siang 35rb gopay"
                    aria-label="Quick entry"
                    enterKeyHint="done"
                    autoComplete="off"
                    disabled={disabled}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] text-ink placeholder:text-faint-ink"
                />
                {text.trim() && (
                    <button
                        type="submit"
                        disabled={disabled}
                        className="h-8 px-2.5 rounded-[9px] bg-ink text-on-ink text-[12px] font-semibold flex items-center gap-1 shrink-0"
                    >
                        Fill <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                )}
            </form>

            {frequent.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {frequent.map((entry) => (
                        <button
                            key={entry.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => onApply(entry)}
                            className={cn(
                                'shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full border border-line bg-surface text-[12px] text-ink hover:bg-surface-soft transition-colors',
                                'disabled:opacity-50 disabled:pointer-events-none'
                            )}
                        >
                            <span className="max-w-[120px] truncate font-medium">{entry.label}</span>
                            <span className={cn('tabular-nums', entry.type === 'income' ? 'text-positive' : 'text-muted-ink')}>
                                {formatShortCurrency(entry.amount)}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
