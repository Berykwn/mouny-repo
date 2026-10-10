import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, ChevronRight, CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { wishListService } from '@/services/wish-list.service'
import { useAccounts, useCategories } from '@/queries'
import { useSeedOnce } from '@/hooks/use-seed-once'
import { formatCurrency, formatCurrencyInput, formatDate, parseCurrencyInput, toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import { CategoryIcon } from '@/features/categories/components/category-icon'
import { categoryChartColor } from '@/features/categories/lib/category-colors'
import { AccountTypeTile } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { CategoryGrid } from '@/components/category-grid'
import { DateQuickPicker } from '@/components/date-quick-picker'
import type { WishListItem, WishPart, Account, Category } from '@/types'

interface BuyItemFormProps {
    item: WishListItem
    /** Buy just this part of a split wish instead of the whole wish. */
    part?: WishPart
    periodStart: string
    onSuccess: () => void
}

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'

const NO_ACCOUNTS: Account[] = []
const NO_CATEGORIES: Category[] = []

export function BuyItemForm({ item, part, periodStart, onSuccess }: BuyItemFormProps) {
    const today = toISODate()
    const defaultDate = today < periodStart ? periodStart : today
    const estimate = part ? part.estimated_price : item.estimated_price

    const [price, setPrice] = useState(estimate ? String(Math.round(estimate)) : '')
    // Off for a part already paid for before it was tracked: marked bought, no expense.
    const [record, setRecord] = useState(true)
    // Not recorded, it may have been bought long before this period, so any past date goes.
    const [boughtOn, setBoughtOn] = useState(today)
    const [boughtOnOpen, setBoughtOnOpen] = useState(false)
    const [date, setDate] = useState(defaultDate)
    const [accountId, setAccountId] = useState('')
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)
    const [categoryId, setCategoryId] = useState('')
    const { data: accountsData } = useAccounts()
    const accounts = accountsData ?? NO_ACCOUNTS
    const { data: categoriesData } = useCategories('expense')
    const categories = categoriesData ?? NO_CATEGORIES
    const [loading, setLoading] = useState(false)

    const selectedAccount = accounts.find((a) => a.id === accountId)
    const selectedCategory = categories.find((c) => c.id === categoryId)

    useSeedOnce(accountsData, accs => setAccountId(accs[0]?.id ?? ''))
    useSeedOnce(categoriesData, cats => setCategoryId(cats[0]?.id ?? ''))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsed = parseCurrencyInput(price)
        if (!price || parsed <= 0) {
            toast.error('Invalid price.')
            return
        }
        if (part && !record) {
            setLoading(true)
            const { error } = await wishListService.buyPart(item, part, { record: false, amount: parsed, date: boughtOn })
            setLoading(false)
            if (error) { toast.error(error); return }
            toast.success(`${part.name} marked as bought`)
            onSuccess()
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

        const { error } = part
            ? await wishListService.buyPart(item, part, {
                record: true,
                amount: parsed,
                account_id: accountId,
                category_id: categoryId,
                date,
            })
            : await wishListService.markAsPurchased(item, {
                account_id: accountId,
                category_id: categoryId,
                actual_price: parsed,
                date,
            })

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success('Purchase recorded successfully')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 pb-2">

            {/* Item info */}
            <div className="rounded-[20px] border border-line bg-surface p-4">
                <p className={FIELD_LABEL + ' mb-0.5'}>
                    {part ? `Part of ${item.name}` : 'Mark as purchased'}
                </p>
                <p className="text-[13px] font-medium text-ink">{part ? part.name : item.name}</p>
                {!!estimate && (
                    <p className="text-[11px] text-muted-ink mt-0.5">
                        Est. {formatCurrency(estimate)}
                    </p>
                )}
                {part && item.saved_amount > 0 && (
                    <p className="text-[11px] text-muted-ink mt-1.5 leading-relaxed">
                        Uses up to {formatCurrency(item.saved_amount)} you set aside for {item.name}.
                    </p>
                )}
            </div>

            {part && (
                <div className="flex items-center justify-between rounded-[14px] border border-line p-3 gap-3">
                    <div className="space-y-0.5">
                        <p className="text-[13px] font-medium text-ink">Record as expense</p>
                        <p className="text-[11.5px] text-muted-ink">
                            {record ? 'Paid from an account, counted in this period' : 'Already paid before — just mark it bought'}
                        </p>
                    </div>
                    <Switch
                        checked={record}
                        onCheckedChange={setRecord}
                        disabled={loading}
                        className="data-[state=checked]:bg-brand"
                    />
                </div>
            )}

            {/* Actual price */}
            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>
                    Actual price
                </Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-ink font-medium">Rp</span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyInput(price)}
                        onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                        placeholder="0"
                        disabled={loading}
                        className="pl-10 h-12 rounded-[14px] border-line text-[13px] font-mono"
                    />
                </div>
            </div>

            {part && !record && (
                <div className="space-y-1.5">
                    <Label className={FIELD_LABEL}>
                        Bought on
                    </Label>
                    <Popover open={boughtOnOpen} onOpenChange={setBoughtOnOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                disabled={loading}
                                className="w-full flex items-center h-12 px-3 rounded-[14px] border border-line bg-surface text-left text-[13px] transition-colors hover:bg-surface-soft disabled:opacity-50"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-ink" />
                                {formatDate(boughtOn)}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-[14px] border-line">
                            <Calendar
                                mode="single"
                                selected={new Date(boughtOn + 'T00:00:00')}
                                defaultMonth={new Date(boughtOn + 'T00:00:00')}
                                onSelect={(d) => {
                                    if (!d) return
                                    setBoughtOn(toISODate(d))
                                    setBoughtOnOpen(false)
                                }}
                                disabled={(d) => toISODate(d) > today}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            )}

            {record && (
                <div className="space-y-5">
                    {/* Account */}
                    <div className="space-y-1.5">
                        <Label className={FIELD_LABEL}>
                            Paid from
                        </Label>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => setAccountPickerOpen(true)}
                            className="w-full flex items-center justify-between px-3 h-[52px] rounded-[14px] border border-line bg-surface text-left transition-colors hover:bg-surface-soft disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {selectedAccount ? (
                                <div className="flex items-center gap-3 min-w-0">
                                    <AccountTypeTile type={selectedAccount.type} savings={selectedAccount.is_savings} />
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-ink truncate">{selectedAccount.name}</p>
                                        <p className="text-[11.5px] text-muted-ink">{formatCurrency(selectedAccount.balance)}</p>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-[13px] text-muted-ink">Select account</span>
                            )}
                            <ChevronRight className="w-4 h-4 text-subtle-ink shrink-0" />
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
                                <span className="text-[11px] text-muted-ink flex items-center gap-1">
                                    <CategoryIcon name={selectedCategory.icon} className="w-3 h-3" style={{ color: categoryChartColor(selectedCategory) }} />
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
        
                    {/* Purchase date */}
                    <div className="space-y-1.5">
                        <Label className={FIELD_LABEL}>
                            Purchase date
                        </Label>
                        <DateQuickPicker
                            date={date}
                            periodStart={periodStart}
                            maxDate={today}
                            onChange={setDate}
                            disabled={loading}
                        />
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : part && !record ? 'Mark as Bought' : 'Mark as Purchased'}
            </button>
        </form>
    )
}
