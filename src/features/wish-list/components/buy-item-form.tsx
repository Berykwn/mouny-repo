import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { wishListService } from '@/services/wish-list.service'
import { accountsService, categoriesService } from '@/services/accounts-categories.service'
import { formatCurrency, toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { WishListItem, Account, Category } from '@/types'

interface BuyItemFormProps {
    item: WishListItem
    periodStart: string     // start date active period — min date
    onSuccess: () => void
}

export function BuyItemForm({ item, periodStart, onSuccess }: BuyItemFormProps) {
    const today = toISODate()
    // const maxDate = today

    const defaultDate = today < periodStart ? periodStart : today

    const [price, setPrice] = useState(item.estimated_price ? String(item.estimated_price) : '')
    const [date, setDate] = useState(defaultDate)
    const [accountId, setAccountId] = useState('')
    const [categoryId, setCategoryId] = useState('none')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([
            accountsService.getAll(),
            categoriesService.getByType('expense'),
        ]).then(([{ data: accs }, { data: cats }]) => {
            if (accs) { setAccounts(accs); setAccountId(accs[0]?.id ?? '') }
            if (cats && cats.length > 0) { setCategories(cats); setCategoryId(cats[0].id) }
        })
    }, [])

    const handlePriceChange = (raw: string) => setPrice(raw.replace(/\D/g, ''))
    const displayPrice = price ? Number(price).toLocaleString('id-ID') : ''

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const parsed = parseInt(price, 10)
        if (!price || isNaN(parsed) || parsed <= 0) {
            setError('Invalid price.')
            return
        }
        if (!categoryId) {
            setError('Please select a category.')
            return
        }

        if (!accountId) {
            setError('Please select an account.')
            return
        }

        if (date < periodStart) {
            setError(`Purchase date cannot be before period start (${periodStart}).`)
            return
        }
        if (date > today) {
            setError("Purchase date cannot be in the future.")
            return
        }

        setLoading(true)
        const { error } = await wishListService.markAsPurchased(item, {
            account_id: accountId,
            category_id: categoryId,
            actual_price: parsed,
            date,
        })
        setLoading(false)

        if (error) { setError(error); toast.error(error); return }

        toast.success('Purchase recorded successfully')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">

            {/* Header */}
            <div className="rounded-xl bg-muted px-4 py-3">
                <p className="text-xs text-muted-foreground">Mark as purchased</p>
                <p className="font-semibold">{item.name}</p>
                {item.estimated_price && (
                    <p className="text-xs text-muted-foreground">
                        Est: {formatCurrency(item.estimated_price)}
                    </p>
                )}
            </div>

            {/* Price */}
            <div className="space-y-1.5">
                <Label>Actual price</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp.
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={displayPrice}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        className="pl-9"
                        required
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Account */}
            <div className="space-y-1.5">
                <Label>Paid from</Label>
                <Select value={accountId} onValueChange={setAccountId} disabled={loading}>
                    <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
                <Label>Category <span className="text-muted-foreground">*</span></Label>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={loading}>
                    <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Date — constrained to active period range */}
            <div className="space-y-1.5">
                <Label>Purchase date</Label>
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={periodStart}
                    max={today}
                    required
                    disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                    Must be within active period ({periodStart} — {today})
                </p>
            </div>

            {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                </p>
            )}

            <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as Purchased'}
            </Button>
        </form>
    )
}