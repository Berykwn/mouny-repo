import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { wishListService } from '@/services/wish-list.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/helpers'
import { ProgressBar } from '@/components/progress-bar'
import { toast } from 'sonner'
import type { WishListItem } from '@/types'
import { partsBreakdown } from '../lib/wish-analytics'

interface ContributeFormProps {
    item: WishListItem
    onSuccess: () => void
}

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

export function ContributeForm({ item, onSuccess }: ContributeFormProps) {
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)

    // A split wish saves toward the parts still to buy.
    const parts = partsBreakdown(item)
    const goal = parts ? parts.openTotal : item.estimated_price ?? 0
    const hasTarget = goal > 0
    const percent = hasTarget ? Math.round((item.saved_amount / goal) * 100) : 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsed = parseCurrencyInput(amount)
        if (!amount || parsed <= 0) {
            toast.error('Invalid amount.')
            return
        }

        setLoading(true)
        const { error } = await wishListService.contribute(item.id, parsed)
        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success('Funds added to savings.')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="rounded-[20px] border border-line bg-surface p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11.5px] text-muted-ink">
                            {parts ? `Set aside for the rest of ${item.name}` : `Saved toward ${item.name}`}
                        </p>
                        <p className="text-[22px] font-medium tracking-[-0.02em] text-ink mt-0.5 tabular-nums">
                            {formatCurrency(item.saved_amount)}
                        </p>
                    </div>
                    {hasTarget && (
                        <p className="text-[11.5px] text-muted-ink tabular-nums">of {formatCurrency(goal)}</p>
                    )}
                </div>
                {hasTarget && (
                    <div className="space-y-1">
                        <ProgressBar percent={percent} />
                        <p className="text-[11px] text-muted-ink">
                            {percent >= 100 ? 'Ready to buy' : `${percent}% saved`}
                        </p>
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Amount to add</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-ink font-medium">
                        Rp
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-12 rounded-[14px] border-line text-[13px] font-mono"
                        disabled={loading}
                        autoFocus
                    />
                </div>
            </div>

            <button type="submit" disabled={loading} className={SUBMIT_BUTTON}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Funds'}
            </button>
        </form>
    )
}
