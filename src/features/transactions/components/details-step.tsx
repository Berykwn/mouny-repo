import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountTypeIcon } from '@/components/account-type-icon'
import { CategoryIcon } from '@/features/categories/components/category-icon'
import { formatCurrency, parseCurrencyInput } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account, Category } from '@/types'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { CategoryGrid } from '@/components/category-grid'
import { DateQuickPicker } from '@/components/date-quick-picker'

type TxType = 'income' | 'expense'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'

interface DetailsStepProps {
    type: TxType
    amount: string
    accounts: Account[]
    accountId: string
    onAccountChange: (id: string) => void
    categories: Category[]
    categoryId: string
    onCategoryChange: (id: string) => void
    date: string
    periodStart: string
    maxDate: string
    onDateChange: (date: string) => void
    note: string
    onNoteChange: (note: string) => void
    onBack: () => void
    onSubmit: () => void
    loading: boolean
}

export function DetailsStep({
    type,
    amount,
    accounts,
    accountId,
    onAccountChange,
    categories,
    categoryId,
    onCategoryChange,
    date,
    periodStart,
    maxDate,
    onDateChange,
    note,
    onNoteChange,
    onBack,
    onSubmit,
    loading,
}: DetailsStepProps) {
    const [accountPickerOpen, setAccountPickerOpen] = useState(false)
    const selectedAccount = accounts.find((a) => a.id === accountId)
    const selectedCategory = categories.find((c) => c.id === categoryId)

    return (
        <div className="flex flex-col h-full">
            <div className="grid grid-cols-[36px_1fr_36px] items-center px-5 pt-3 pb-2 shrink-0">
                <button
                    type="button"
                    disabled={loading}
                    onClick={onBack}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#8a8a84] hover:bg-[#f4f4f2] active:bg-[#f4f4f2] transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                    <ChevronLeft className="w-5 h-5" strokeWidth={2} />
                </button>

                <button
                    type="button"
                    disabled={loading}
                    onClick={onBack}
                    className="mx-auto flex items-center gap-1 rounded-full px-3 h-9 hover:bg-[#f4f4f2] active:bg-[#f4f4f2] transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                    <span className={cn(
                        'text-[22px] font-semibold tracking-[-0.02em]',
                        type === 'income' ? 'text-[#059669]' : 'text-[#dc2626]'
                    )}>
                        {formatCurrency(parseCurrencyInput(amount))}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#a3a3a3]" />
                </button>

                <div />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2 space-y-5">
                <div className="space-y-1.5">
                    <Label className={FIELD_LABEL}>Account</Label>
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
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label className={FIELD_LABEL}>Category</Label>
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
                        onSelect={(c) => onCategoryChange(c.id)}
                        disabled={loading}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className={FIELD_LABEL}>Date</Label>
                    <DateQuickPicker
                        date={date}
                        periodStart={periodStart}
                        maxDate={maxDate}
                        onChange={onDateChange}
                        disabled={loading}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className={FIELD_LABEL}>
                        Note <span className="normal-case tracking-normal font-normal">(optional)</span>
                    </Label>
                    <Input
                        type="text"
                        placeholder="Lunch, fuel, etc"
                        value={note}
                        onChange={(e) => onNoteChange(e.target.value)}
                        onFocus={(e) => {
                            const target = e.target
                            setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
                        }}
                        disabled={loading}
                        className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                    />
                </div>
            </div>

            <div className="shrink-0 border-t border-[#f2f2f0] px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] bg-white">
                <button
                    type="button"
                    disabled={loading}
                    onClick={onSubmit}
                    className="w-full h-14 rounded-[14px] text-[15px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                </button>
            </div>

            <AccountPickerDrawer
                open={accountPickerOpen}
                onClose={() => setAccountPickerOpen(false)}
                accounts={accounts}
                selectedId={accountId}
                onSelect={(account) => {
                    onAccountChange(account.id)
                    setAccountPickerOpen(false)
                }}
            />
        </div>
    )
}
