import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { wishListService } from '@/services/wish-list.service'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { WishListPriority } from '@/types'

interface WishListFormProps {
    payPeriodId: string
    onSuccess: () => void
}

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'

const PRIORITIES: { value: WishListPriority; label: string; style: string }[] = [
    { value: 'low', label: 'Low', style: 'bg-[#f4f4f2] text-[#8a8a84]' },
    { value: 'medium', label: 'Medium', style: 'bg-[#fff7ed] text-[#d97706]' },
    { value: 'high', label: 'High', style: 'bg-[#fef2f2] text-[#dc2626]' },
]

export function WishListForm({ payPeriodId, onSuccess }: WishListFormProps) {
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')
    const [priority, setPriority] = useState<WishListPriority>('low')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const parsed = price ? parseCurrencyInput(price) : undefined

        if (price && (!parsed || parsed <= 0)) {
            toast.error('Invalid estimated price.')
            setLoading(false)
            return
        }

        const { error } = await wishListService.create({
            pay_period_id: payPeriodId,
            name,
            estimated_price: parsed,
            priority,
            notes: notes || undefined,
        })

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success('Item added to wishlist')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-3">
            <div className="space-y-2">
                <Label className={FIELD_LABEL}>Item name</Label>
                <Input
                    placeholder="Shoes, laptop, etc"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                />
            </div>

            <div className="space-y-2">
                <Label className={FIELD_LABEL}>
                    Estimated price <span className="normal-case tracking-normal font-normal">(optional)</span>
                </Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a84] font-medium">
                        Rp
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatCurrencyInput(price)}
                        onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className={FIELD_LABEL}>Priority</Label>
                <div className="flex gap-2">
                    {PRIORITIES.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => setPriority(p.value)}
                            className={cn(
                                'flex-1 py-2 rounded-[10px] text-[13px] font-medium border transition-all',
                                priority === p.value
                                    ? `${p.style} border-transparent`
                                    : 'border-[#e5e5e5] text-[#8a8a84] hover:text-[#252525]'
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label className={FIELD_LABEL}>
                    Notes <span className="normal-case tracking-normal font-normal">(optional)</span>
                </Label>
                <Input
                    placeholder="Additional details"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Item'}
            </button>
        </form>
    )
}
