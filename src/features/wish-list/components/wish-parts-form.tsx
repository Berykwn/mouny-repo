import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, X, Check } from 'lucide-react'
import { wishListService } from '@/services/wish-list.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/helpers'
import { toast } from 'sonner'
import type { WishListItem } from '@/types'

interface WishPartsFormProps {
    item: WishListItem
    onSuccess: () => void
}

interface Row {
    /** Set for a part that's already saved. */
    id?: string
    /** Stable React key, also for rows not saved yet. */
    key: string
    name: string
    price: string
}

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'

let rowKey = 0
const newRow = (): Row => ({ key: `new-${rowKey++}`, name: '', price: '' })

/** Split a wish into parts, or change the parts not bought yet. */
export function WishPartsForm({ item, onSuccess }: WishPartsFormProps) {
    const parts = item.parts ?? []
    const bought = parts.filter(p => p.is_purchased)
    const [rows, setRows] = useState<Row[]>(() => {
        const open = parts.filter(p => !p.is_purchased).map(p => ({
            id: p.id,
            key: p.id,
            name: p.name,
            price: p.estimated_price ? String(Math.round(p.estimated_price)) : '',
        }))
        // A first split starts with two empty rows: one part isn't a split.
        return open.length > 0 ? open : [newRow(), newRow()]
    })
    const [loading, setLoading] = useState(false)

    const setRow = (key: string, patch: Partial<Row>) =>
        setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)))

    const openTotal = rows.reduce((s, r) => s + (r.price ? parseCurrencyInput(r.price) : 0), 0)
    const spent = bought.reduce((s, p) => s + (p.paid_amount ?? 0), 0)
    // With some parts bought, saving an empty "still to buy" list finishes the wish.
    const finishes = bought.length > 0 && !rows.some(r => r.id || r.name.trim() || r.price)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Rows left completely empty are skipped, so a spare row doesn't block saving.
        const filled = rows.filter(r => r.id || r.name.trim() || r.price)
        if (filled.some(r => !r.name.trim())) {
            toast.error('Every part needs a name.')
            return
        }
        // Removing every part of a split wish (none bought) turns it back into one item.
        const unsplit = filled.length + bought.length === 0
        if (unsplit && parts.length === 0) {
            toast.error('Add at least one part.')
            return
        }

        setLoading(true)
        const { data, error } = await wishListService.saveParts(item, filled.map(r => ({
            id: r.id,
            name: r.name,
            estimated_price: r.price ? parseCurrencyInput(r.price) : null,
        })))
        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success(data?.is_purchased ? `${item.name} is complete!`
            : unsplit ? 'Parts removed'
            : parts.length > 0 ? 'Parts updated'
            : 'Wish split into parts')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-3">
            <p className="text-[12px] text-muted-ink leading-relaxed">
                Buy each part on its own — {item.name} is done once every part is bought.
                Money you set aside for it goes toward the parts.
            </p>

            {bought.length > 0 && (
                <div className="space-y-1.5">
                    <p className={FIELD_LABEL}>Bought</p>
                    <ul className="rounded-[14px] border border-line divide-y divide-line-soft">
                        {bought.map(p => (
                            <li key={p.id} className="flex items-center gap-2.5 px-3 py-2.5">
                                <span className="w-5 h-5 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0">
                                    <Check className="w-3 h-3" />
                                </span>
                                <span className="flex-1 min-w-0 text-[13px] text-ink truncate">{p.name}</span>
                                <span className="text-[12px] text-muted-ink tabular-nums">{formatCurrency(p.paid_amount ?? 0)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="space-y-1.5">
                <p className={FIELD_LABEL}>{bought.length > 0 ? 'Still to buy' : 'Parts'}</p>
                <div className="space-y-2">
                    {rows.map((row, i) => (
                        <div key={row.key} className="flex gap-2">
                            <Input
                                placeholder={i === 0 ? 'e.g. Motherboard' : 'Part name'}
                                value={row.name}
                                onChange={(e) => setRow(row.key, { name: e.target.value })}
                                disabled={loading}
                                maxLength={80}
                                className="flex-1 min-w-0 h-11 rounded-[12px] border-line text-[13px]"
                            />
                            <div className="relative w-[38%] shrink-0">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-ink font-medium">Rp</span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Price"
                                    aria-label={`Price of ${row.name || 'part'}`}
                                    value={formatCurrencyInput(row.price)}
                                    onChange={(e) => setRow(row.key, { price: e.target.value.replace(/\D/g, '') })}
                                    disabled={loading}
                                    className="pl-9 h-11 rounded-[12px] border-line text-[13px] font-mono"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setRows(rs => rs.filter(r => r.key !== row.key))}
                                disabled={loading}
                                aria-label={`Remove ${row.name || 'part'}`}
                                className="w-9 h-11 shrink-0 flex items-center justify-center rounded-[12px] text-muted-ink hover:text-negative hover:bg-surface-hover disabled:opacity-50"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => setRows(rs => [...rs, newRow()])}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-[12.5px] font-medium text-brand hover:underline py-1.5"
                >
                    <Plus className="w-3.5 h-3.5" /> Add part
                </button>
            </div>

            {(openTotal > 0 || spent > 0) && (
                <div className="rounded-[14px] bg-surface-soft border border-line-soft px-3 py-2.5 text-[12px] text-muted-ink space-y-0.5 tabular-nums">
                    {spent > 0 && <p>Bought so far: <span className="text-ink font-medium">{formatCurrency(spent)}</span></p>}
                    <p>Still to buy: <span className="text-ink font-medium">{formatCurrency(openTotal)}</span></p>
                    {spent > 0 && <p>Total: <span className="text-ink font-medium">{formatCurrency(spent + openTotal)}</span></p>}
                </div>
            )}

            {finishes && (
                <p className="rounded-[14px] bg-positive/10 px-3 py-2.5 text-[12px] text-positive leading-relaxed">
                    Nothing left to buy — saving marks {item.name} as done.
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : finishes ? 'Save & Finish Wish' : 'Save Parts'}
            </button>
        </form>
    )
}
