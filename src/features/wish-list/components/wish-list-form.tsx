import { useState } from 'react'
import { Button } from '@/components/ui/button'
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

const PRIORITIES: { value: WishListPriority; label: string; style: string }[] = [
    { value: 'low', label: 'Low', style: 'bg-muted text-muted-foreground' },
    { value: 'medium', label: 'Medium', style: 'bg-amber-50 text-amber-600 dark:bg-amber-900/40' },
    { value: 'high', label: 'High', style: 'bg-red-50 text-red-600 dark:bg-red-900/40' },
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
                <Label>Item name</Label>
                <Input
                    placeholder="Shoes, laptop, etc"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            <div className="space-y-2">
                <Label>
                    Estimated price <span className="text-muted-foreground">(optional)</span>
                </Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                        Rp
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatCurrencyInput(price)}
                        onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-11 text-sm font-mono"
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Priority</Label>
                <div className="flex gap-2">
                    {PRIORITIES.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => setPriority(p.value)}
                            className={cn(
                                'flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
                                priority === p.value
                                    ? `${p.style} border-transparent`
                                    : 'border-border text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label>
                    Notes <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                    placeholder="Additional details"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                />
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold" disabled={loading}>
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    'Save Item'
                )}
            </Button>
        </form>
    )
}