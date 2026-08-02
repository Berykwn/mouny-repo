import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { wishListService } from '@/services/wish-list.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { WISH_LIST_UNITS, type WishListItem, type WishListPriority } from '@/types'

interface WishListFormProps {
    payPeriodId: string
    item?: WishListItem
    onSuccess: () => void
}

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'

const PRIORITIES: { value: WishListPriority; label: string; style: string }[] = [
    { value: 'low', label: 'Low', style: 'bg-[#f4f4f2] text-[#8a8a84]' },
    { value: 'medium', label: 'Medium', style: 'bg-[#fff7ed] text-[#d97706]' },
    { value: 'high', label: 'High', style: 'bg-[#fef2f2] text-[#dc2626]' },
]

export function WishListForm({ payPeriodId, item, onSuccess }: WishListFormProps) {
    const isEdit = !!item
    const itemUnit = item?.unit ?? null
    const presetUnit = itemUnit && (WISH_LIST_UNITS as readonly string[]).includes(itemUnit) ? itemUnit : null

    const [name, setName] = useState(item?.name ?? '')
    const [price, setPrice] = useState(item?.estimated_price ? String(item.estimated_price) : '')
    const [priority, setPriority] = useState<WishListPriority>((item?.priority as WishListPriority) ?? 'low')
    const [notes, setNotes] = useState(item?.notes ?? '')
    const [loading, setLoading] = useState(false)

    const [trackByQuantity, setTrackByQuantity] = useState(!!item?.quantity)
    const [quantity, setQuantity] = useState(item?.quantity ? String(item.quantity) : '')
    const [unit, setUnit] = useState<string>(presetUnit ?? (itemUnit ? 'custom' : WISH_LIST_UNITS[0]))
    const [customUnit, setCustomUnit] = useState(itemUnit && !presetUnit ? itemUnit : '')
    const [pricePerUnit, setPricePerUnit] = useState(item?.price_per_unit ? String(item.price_per_unit) : '')

    const quantityNum = Number(quantity) || 0
    const pricePerUnitNum = pricePerUnit ? parseCurrencyInput(pricePerUnit) : 0
    const computedTarget = quantityNum * pricePerUnitNum

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        let payload: {
            name: string
            priority: WishListPriority
            notes?: string
            estimated_price?: number
            quantity?: number | null
            unit?: string | null
            price_per_unit?: number | null
        } = { name, priority, notes: notes || undefined }

        if (trackByQuantity) {
            const resolvedUnit = unit === 'custom' ? customUnit.trim() : unit

            if (quantityNum <= 0) {
                toast.error('Quantity must be greater than zero.')
                return
            }
            if (!resolvedUnit) {
                toast.error('Please specify a unit.')
                return
            }
            if (pricePerUnitNum <= 0) {
                toast.error('Price per unit must be greater than zero.')
                return
            }

            payload = {
                ...payload,
                quantity: quantityNum,
                unit: resolvedUnit,
                price_per_unit: pricePerUnitNum,
            }
        } else {
            const parsed = price ? parseCurrencyInput(price) : undefined

            if (price && (!parsed || parsed <= 0)) {
                toast.error('Invalid estimated price.')
                return
            }

            payload = {
                ...payload,
                estimated_price: parsed,
                quantity: null,
                unit: null,
                price_per_unit: null,
            }
        }

        setLoading(true)

        const { error } = isEdit
            ? await wishListService.update(item!.id, payload)
            : await wishListService.create({ pay_period_id: payPeriodId, ...payload })

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success(isEdit ? 'Item updated' : 'Item added to wishlist')
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

            <div className="flex items-center justify-between rounded-[14px] border border-[#e5e5e5] p-3 gap-3">
                <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-[#252525]">Track by quantity</p>
                    <p className="text-[11.5px] text-[#8a8a84]">For items with a fluctuating price, like gold</p>
                </div>
                <Switch
                    checked={trackByQuantity}
                    onCheckedChange={setTrackByQuantity}
                    disabled={loading}
                    className="data-[state=checked]:bg-[#6FA82B]"
                />
            </div>

            {trackByQuantity ? (
                <div className="space-y-3">
                    <div className="flex gap-3">
                        <div className="space-y-2 flex-1">
                            <Label className={FIELD_LABEL}>Quantity</Label>
                            <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, ''))}
                                disabled={loading}
                                className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                            />
                        </div>
                        <div className="space-y-2 flex-1">
                            <Label className={FIELD_LABEL}>Unit</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {[...WISH_LIST_UNITS, 'custom'].map((u) => (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => setUnit(u)}
                                        disabled={loading}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium border transition-all capitalize',
                                            unit === u
                                                ? 'bg-[#f2f6ea] text-[#4d7a1d] border-transparent'
                                                : 'border-[#e5e5e5] text-[#8a8a84] hover:text-[#252525]'
                                        )}
                                    >
                                        {u === 'custom' ? 'Other' : u}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {unit === 'custom' && (
                        <Input
                            placeholder="Unit name (e.g. keping)"
                            value={customUnit}
                            onChange={(e) => setCustomUnit(e.target.value)}
                            disabled={loading}
                            className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                        />
                    )}

                    <div className="space-y-2">
                        <Label className={FIELD_LABEL}>Price per unit</Label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a84] font-medium">
                                Rp
                            </span>
                            <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={formatCurrencyInput(pricePerUnit)}
                                onChange={(e) => setPricePerUnit(e.target.value.replace(/\D/g, ''))}
                                className="pl-10 h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {computedTarget > 0 && (
                        <p className="text-[12px] text-[#8a8a84]">
                            Target: <span className="font-medium text-[#252525]">{formatCurrency(computedTarget)}</span>
                        </p>
                    )}
                </div>
            ) : (
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
            )}

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
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEdit ? 'Save Changes' : 'Save Item'}
            </button>
        </form>
    )
}
