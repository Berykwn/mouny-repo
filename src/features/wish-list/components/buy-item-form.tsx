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
    onSuccess: () => void
}

export function BuyItemForm({ item, onSuccess }: BuyItemFormProps) {
    const [price, setPrice] = useState(
        item.estimated_price ? String(item.estimated_price) : ''
    )
    const [date, setDate] = useState(toISODate())
    const [accountId, setAccountId] = useState('')
    const [categoryId, setCategoryId] = useState('none') // ⬅️ fix disini
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([
            accountsService.getAll(),
            categoriesService.getByType('expense'),
        ]).then(([{ data: accs }, { data: cats }]) => {
            if (accs) {
                setAccounts(accs)
                setAccountId(accs[0]?.id ?? '')
            }
            if (cats) {
                setCategories(cats)
                setCategoryId(cats[0]?.id ?? 'none')
            }
        })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const parsed = parseFloat(price.replace(/\./g, '').replace(',', '.'))

        if (isNaN(parsed) || parsed <= 0) {
            const msg = 'Invalid price.'
            setError(msg)
            toast.error(msg)
            return
        }

        if (!accountId) {
            const msg = 'Please select an account.'
            setError(msg)
            toast.error(msg)
            return
        }

        setLoading(true)

        const { error } = await wishListService.markAsPurchased(item, {
            account_id: accountId,
            category_id: categoryId === 'none' ? undefined : categoryId, // ⬅️ fix logic
            actual_price: parsed,
            date,
        })

        setLoading(false)

        if (error) {
            setError(error)
            toast.error(error)
            return
        }

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
                <Input
                    type="text"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) =>
                        setPrice(e.target.value.replace(/[^0-9.,]/g, ''))
                    }
                    required
                    disabled={loading}
                />
            </div>

            {/* Account */}
            <div className="space-y-1.5">
                <Label>Paid from</Label>
                <Select
                    value={accountId}
                    onValueChange={setAccountId}
                    disabled={loading}
                >
                    <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                                {a.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
                <Label>
                    Category <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Select
                    value={categoryId}
                    onValueChange={setCategoryId}
                    disabled={loading}
                >
                    <SelectTrigger className="h-10">
                        <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
                <Label>Purchase date</Label>
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            {/* Error */}
            {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                </p>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    'Mark as Purchased'
                )}
            </Button>
        </form>
    )
}