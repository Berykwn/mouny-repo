import { useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CalendarIcon, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { debtsService } from '@/services/debts.service'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-[#8a8a84]'
const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

interface EditDebtFormProps {
    debt: DebtWithAccount
    onSuccess: () => void
}

/**
 * Edit a debt's details. Changing the total only changes the record: no transaction is
 * made, and payments already recorded stay as they are.
 */
export function EditDebtForm({ debt, onSuccess }: EditDebtFormProps) {
    const isDebt = debt.type === 'debt'
    const paid = debt.total_amount - debt.remaining_amount

    const [counterparty, setCounterparty] = useState(debt.counterparty)
    const [amount, setAmount] = useState(String(debt.total_amount))
    const [dueDate, setDueDate] = useState(debt.due_date ?? '')
    const [dueDateOpen, setDueDateOpen] = useState(false)
    const [notes, setNotes] = useState(debt.notes ?? '')
    const [loading, setLoading] = useState(false)

    const parsed = parseCurrencyInput(amount)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!counterparty.trim()) { toast.error('Please enter a name.'); return }
        if (!amount || parsed <= 0) { toast.error('Invalid amount.'); return }
        if (parsed < paid) {
            toast.error(`Total can’t be less than what’s already ${isDebt ? 'paid' : 'collected'} (${formatCurrency(paid)}).`)
            return
        }

        setLoading(true)
        const { error } = await debtsService.update(debt.id, {
            counterparty: counterparty.trim(),
            total_amount: parsed,
            due_date: dueDate || null,
            notes: notes.trim() || null,
        })
        setLoading(false)
        if (error) { toast.error(error); return }
        toast.success('Debt updated.')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>{isDebt ? 'Lender name' : 'Borrower name'}</Label>
                <Input
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                />
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Total amount</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#8a8a84] font-medium">Rp</span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyInput(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 h-12 rounded-[14px] border-[#e5e5e5] text-[13px] font-mono"
                        required
                        disabled={loading}
                    />
                </div>
                {paid > 0 && (
                    <p className="text-[11px] text-muted-ink px-1">
                        {formatCurrency(paid)} already {isDebt ? 'paid' : 'collected'} — {formatCurrency(Math.max(0, parsed - paid))} will remain.
                    </p>
                )}
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Due date <span className="normal-case tracking-normal font-normal">(optional)</span></Label>
                <div className="flex gap-2">
                    <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                disabled={loading}
                                className={cn(
                                    'flex-1 flex items-center h-12 px-3 rounded-[14px] border border-[#e5e5e5] bg-white text-left text-[13px] transition-colors hover:bg-[#fbfbfa] disabled:opacity-50 disabled:pointer-events-none',
                                    !dueDate && 'text-[#8a8a84]'
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-[#8a8a84]" />
                                {dueDate ? format(new Date(dueDate + 'T00:00:00'), 'dd MMM yyyy') : 'Pick a date'}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-[14px] border-[#e5e5e5]">
                            <Calendar
                                mode="single"
                                selected={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
                                onSelect={(d) => {
                                    if (!d) return
                                    setDueDate(format(d, 'yyyy-MM-dd'))
                                    setDueDateOpen(false)
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                    {dueDate && (
                        <button
                            type="button"
                            aria-label="Clear due date"
                            disabled={loading}
                            onClick={() => setDueDate('')}
                            className="w-12 h-12 rounded-[14px] border border-[#e5e5e5] bg-white flex items-center justify-center text-muted-ink hover:text-ink hover:bg-[#fbfbfa]"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Note <span className="normal-case tracking-normal font-normal">(optional)</span></Label>
                <Input
                    placeholder="Details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    className="h-12 rounded-[14px] border-[#e5e5e5] text-[13px]"
                />
            </div>

            <button type="submit" disabled={loading} className={SUBMIT_BUTTON}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save changes'}
            </button>
        </form>
    )
}
