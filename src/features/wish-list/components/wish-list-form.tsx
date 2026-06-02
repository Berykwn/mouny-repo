import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { wishListService } from '@/services/wish-list.service'
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
    const [error, setError] = useState<string | null>(null)

    const handlePriceChange = (raw: string) => {
        const digitsOnly = raw.replace(/\D/g, '')
        setPrice(digitsOnly)
    }

    const displayPrice = price
        ? Number(price).toLocaleString('id-ID')
        : ''

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const parsed = price ? parseInt(price, 10) : undefined

        if (price && (isNaN(parsed!) || parsed! <= 0)) {
            const msg = 'Invalid estimated price.'
            setError(msg)
            toast.error(msg)
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
            setError(error)
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp.
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={displayPrice}
                        onChange={(e) => handlePriceChange(e.target.value)}
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

            {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                </p>
            )}

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