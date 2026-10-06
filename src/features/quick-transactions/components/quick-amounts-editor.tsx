import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useQuickTransactions } from '@/queries'
import { quickTransactionsService } from '@/services/quick-transactions.service'
import { formatCurrencyInput, formatShortCurrency, parseCurrencyInput } from '@/lib/helpers'
import type { Category } from '@/types'

/** A category's quick amounts: add "2rb", "5rb", optionally named, and remove them. */
export function QuickAmountsEditor({ category }: { category: Pick<Category, 'id' | 'name'> }) {
    const { data: all } = useQuickTransactions()
    const quicks = (all ?? []).filter(q => q.category_id === category.id)
    const [amount, setAmount] = useState('')
    const [label, setLabel] = useState('')
    const [saving, setSaving] = useState(false)
    const [removing, setRemoving] = useState<string | null>(null)

    const add = async (e: React.FormEvent) => {
        e.preventDefault()
        const parsed = parseCurrencyInput(amount)
        if (parsed <= 0) { toast.error('Enter an amount.'); return }
        if (quicks.some(q => q.amount === parsed && (q.label ?? '') === label.trim())) { toast.error('That one is already there.'); return }
        setSaving(true)
        const { error } = await quickTransactionsService.create({ category_id: category.id, amount: parsed, label: label.trim() || null })
        setSaving(false)
        if (error) { toast.error(error); return }
        setAmount('')
        setLabel('')
    }

    const remove = async (id: string) => {
        setRemoving(id)
        const { error } = await quickTransactionsService.remove(id)
        setRemoving(null)
        if (error) toast.error(error)
    }

    return (
        <div className="rounded-[20px] border border-line p-4 space-y-3">
            <div>
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Quick amounts</p>
                <p className="mt-0.5 text-[11.5px] text-subtle-ink">Shown as one-tap pills on the overview and the add form.</p>
            </div>

            {quicks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {quicks.map(q => (
                        <span key={q.id} className="flex items-center gap-1 h-8 pl-3 pr-1 rounded-full border border-line bg-surface text-[12.5px] text-ink">
                            <span className="font-medium">{q.label || category.name}</span>
                            <span className="text-muted-ink tabular-nums">{formatShortCurrency(q.amount)}</span>
                            <button
                                type="button"
                                onClick={() => remove(q.id)}
                                disabled={removing === q.id}
                                aria-label={`Remove ${q.label || category.name} ${formatShortCurrency(q.amount)}`}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-subtle-ink hover:text-negative hover:bg-surface-hover transition-colors"
                            >
                                {removing === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <form onSubmit={add} className="flex gap-2">
                <div className="relative w-[118px] shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-ink">Rp</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        aria-label="Amount"
                        placeholder="2.000"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        disabled={saving}
                        className="w-full h-10 pl-8 pr-2 rounded-[12px] border border-line bg-surface text-[13px] text-ink tabular-nums outline-none focus:border-ink/30"
                    />
                </div>
                <input
                    type="text"
                    aria-label="Name (optional)"
                    placeholder={`Name (${category.name})`}
                    value={label}
                    maxLength={40}
                    onChange={(e) => setLabel(e.target.value)}
                    disabled={saving}
                    className="flex-1 min-w-0 h-10 px-3 rounded-[12px] border border-line bg-surface text-[13px] text-ink outline-none focus:border-ink/30 placeholder:text-faint-ink"
                />
                <button
                    type="submit"
                    disabled={saving || !amount}
                    aria-label="Add quick amount"
                    className="w-10 h-10 rounded-[12px] bg-ink text-on-ink flex items-center justify-center shrink-0 disabled:opacity-40"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
            </form>
        </div>
    )
}
