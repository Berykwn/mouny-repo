import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ChevronRight } from 'lucide-react'
import { wishListService } from '@/services/wish-list.service'
import { accountsService, categoriesService } from '@/services/accounts-categories.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import { ProgressBar } from '@/components/progress-bar'
import { CategoryIcon } from '@/features/categories/components/category-icon'
import { AccountTypeIcon } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { CategoryGrid } from '@/components/category-grid'
import { DateQuickPicker } from '@/components/date-quick-picker'
import type { WishListItem, Account, Category } from '@/types'

interface ContributeQuantityFormProps {
    item: WishListItem
    periodStart: string
    onSuccess: () => void
}

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'

export function ContributeQuantityForm({ item, periodStart, onSuccess }: ContributeQuantityFormProps) {
    const today = toISODate()
    const defaultDate = today < periodStart ? periodStart : today

    const target = item.quantity ?? 0
    const savedQuantity = item.saved_quantity ?? 0
    const percent = target > 0 ? Math.round((savedQuantity / target) * 100) : 0

    const [quantity, setQuantity] = useState('')
    const [pricePerUnit, setPricePerUnit] = useState(item.price_per_unit ? String(item.price_per_unit) : '')
    const [date, setDate] = useState(defaultDate)
    const [accountId, setAccountId] = useState('')
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)
    const [categoryId, setCategoryId] = useState('none')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)

    const selectedAccount = accounts.find((a) => a.id === accountId)
    const selectedCategory = categories.find((c) => c.id === categoryId)

    const quantityNum = Number(quantity) || 0
    const pricePerUnitNum = pricePerUnit ? parseCurrencyInput(pricePerUnit) : 0
    const total = quantityNum * pricePerUnitNum

    useEffect(() => {
        Promise.all([
            accountsService.getAll(),
            categoriesService.getByType('expense'),
        ]).then(([{ data: accs }, { data: cats }]) => {
            if (accs) { setAccounts(accs); setAccountId(accs[0]?.id ?? '') }
            if (cats && cats.length > 0) { setCategories(cats); setCategoryId(cats[0].id) }
        })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (quantityNum <= 0) {
            toast.error('Invalid quantity.')
            return
        }
        if (pricePerUnitNum <= 0) {
            toast.error('Invalid price per unit.')
            return
        }
        if (!categoryId) {
            toast.error('Please select a category.')
            return
        }
        if (!accountId) {
            toast.error('Please select an account.')
            return
        }
        if (date < periodStart) {
            toast.error(`Purchase date cannot be before period start (${periodStart}).`)
            return
        }
        if (date > today) {
            toast.error('Purchase date cannot be in the future.')
            return
        }

        setLoading(true)

        const { data, error } = await wishListService.contributeQuantity(item, {
            quantity: quantityNum,
            price_per_unit: pricePerUnitNum,
            account_id: accountId,
            category_id: categoryId,
            date,
        })

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success(data?.is_purchased
            ? 'Cicilan tercatat, wish list selesai!'
            : `Cicilan ${quantityNum} ${item.unit} tercatat`)
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 pb-2">

            {/* Progress */}
            <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11.5px] text-[#8a8a84]">Terkumpul untuk {item.name}</p>
                        <p className="text-[22px] font-medium tracking-[-0.02em] text-[#252525] mt-0.5 tabular-nums">
                            {savedQuantity} {item.unit}
                        </p>
                    </div>
                    {target > 0 && (
                        <p className="text-[11.5px] text-[#8a8a84] tabular-nums">of {target} {item.unit}</p>
                    )}
                </div>
                {target > 0 && (
                    <div className="space-y-1">
                        <ProgressBar percent={percent} />
                        <p className="text-[11px] text-[#8a8a84]">
                            {percent >= 100 ? 'Selesai' : `${percent}% terkumpul`}
                        </p>
                    </div>
                )}
            </div>

            {/* Quantity + price per unit */}
            <div className="flex gap-3">
                <div className="space-y-1.5 flex-1">
                    <Label className={FIELD_LABEL}>Jumlah {item.unit}</Label>
                    <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, ''))}
                        disabled={loading}
                        autoFocus
                        className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                    />
                </div>
                <div className="space-y-1.5 flex-1">
                    <Label className={FIELD_LABEL}>Harga/{item.unit}</Label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a84] font-medium">Rp</span>
                        <Input
                            type="text"
                            inputMode="numeric"
                            value={formatCurrencyInput(pricePerUnit)}
                            onChange={(e) => setPricePerUnit(e.target.value.replace(/\D/g, ''))}
                            placeholder="0"
                            disabled={loading}
                            className="pl-10 h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                        />
                    </div>
                </div>
            </div>

            {total > 0 && (
                <p className="text-[12px] text-[#8a8a84]">
                    Total: <span className="font-medium text-[#252525]">{formatCurrency(total)}</span>
                </p>
            )}

            {/* Account */}
            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>
                    Paid from
                </Label>
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => setAccountPickerOpen(true)}
                    className="w-full flex items-center justify-between px-3 h-[52px] rounded-[14px] border border-[#e5e5e5] bg-white text-left transition-colors hover:bg-[#fbfbfa] disabled:opacity-50 disabled:pointer-events-none"
                >
                    {selectedAccount ? (
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-[10px] bg-[#f4f4f2] flex items-center justify-center shrink-0">
                                <AccountTypeIcon type={selectedAccount.type} className="w-4 h-4 text-[#8a8a84]" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[#252525] truncate">{selectedAccount.name}</p>
                                <p className="text-[11.5px] text-[#8a8a84]">{formatCurrency(selectedAccount.balance)}</p>
                            </div>
                        </div>
                    ) : (
                        <span className="text-[13px] text-[#8a8a84]">Select account</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-[#a3a3a3] shrink-0" />
                </button>
                <AccountPickerDrawer
                    open={accountPickerOpen}
                    onClose={() => setAccountPickerOpen(false)}
                    accounts={accounts}
                    selectedId={accountId}
                    onSelect={(a) => { setAccountId(a.id); setAccountPickerOpen(false) }}
                />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label className={FIELD_LABEL}>
                        Category
                    </Label>
                    {selectedCategory && (
                        <span className="text-[11px] text-[#8a8a84] flex items-center gap-1">
                            <CategoryIcon name={selectedCategory.icon} className="w-3 h-3" style={{ color: selectedCategory.color ?? undefined }} />
                            {selectedCategory.name}
                        </span>
                    )}
                </div>
                <CategoryGrid
                    categories={categories}
                    selectedId={categoryId}
                    onSelect={(c) => setCategoryId(c.id)}
                    disabled={loading}
                />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>
                    Date
                </Label>
                <DateQuickPicker
                    date={date}
                    periodStart={periodStart}
                    maxDate={today}
                    onChange={setDate}
                    disabled={loading}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Cicil'}
            </button>
        </form>
    )
}
