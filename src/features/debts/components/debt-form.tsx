import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CalendarIcon } from 'lucide-react'
import { debtsService } from '@/services/debts.service'
import { accountsService } from '@/services/accounts-categories.service'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Account } from '@/types'
import { toast } from 'sonner'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface DebtFormProps {
    onSuccess: () => void
}

type DebtType = 'debt' | 'receivable'

export function DebtForm({ onSuccess }: DebtFormProps) {
    const [type, setType] = useState<DebtType>('debt')
    const [counterparty, setCounterparty] = useState('')
    const [amount, setAmount] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [accountId, setAccountId] = useState('')
    const [notes, setNotes] = useState('')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        accountsService.getAll().then(({ data }) => {
            if (data) setAccounts(data)
        })
    }, [])

    const handleAmountChange = (raw: string) => {
        setAmount(raw.replace(/\D/g, ''))
    }

    const displayAmount = amount ? Number(amount).toLocaleString('id-ID') : ''

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const parsed = parseInt(amount, 10)
        if (!amount || isNaN(parsed) || parsed <= 0) {
            toast.error('Invalid amount.')
            return
        }
        if (!counterparty.trim()) {
            toast.error('Please enter a name.')
            return
        }

        setLoading(true)
        const { error } = await debtsService.create({
            type,
            counterparty: counterparty.trim(),
            total_amount: parsed,
            remaining_amount: parsed,
            due_date: dueDate || null,
            pay_from_account_id: accountId || null,
            status: 'active',
            notes: notes || null,
        })
        setLoading(false)

        if (error) { toast.error(error); return }
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">

            <ToggleGroup
                variant="outline"
                type="single"
                value={type}
                onValueChange={(val) => val && setType(val as DebtType)}
                className="w-full"
            >
                <ToggleGroupItem value="debt" className="flex-1">
                    Debt
                </ToggleGroupItem>
                <ToggleGroupItem value="receivable" className="flex-1">
                    Receivable
                </ToggleGroupItem>
            </ToggleGroup>

            <div className="space-y-1.5">
                <Label>{type === 'debt' ? 'Lender name' : 'Borrower name'}</Label>
                <Input
                    placeholder="Person or party"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            <div className="space-y-1.5">
                <Label>Amount</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp.
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={displayAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="pl-9"
                        required
                        disabled={loading}
                    />
                </div>
            </div>

            {/* 🔥 INI YANG DIUBAH */}
            <div className="space-y-1.5">
                <Label>Due date <span className="text-muted-foreground">(optional)</span></Label>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'w-full justify-start text-left font-normal',
                                !dueDate && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate
                                ? format(new Date(dueDate), 'yyyy-MM-dd')
                                : 'Pick a date'}
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={dueDate ? new Date(dueDate) : undefined}
                            onSelect={(d) => {
                                if (!d) return
                                setDueDate(format(d, 'yyyy-MM-dd'))
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-1.5">
                <Label>Pay from account <span className="text-muted-foreground">(optional)</span></Label>
                <Select value={accountId} onValueChange={setAccountId} disabled={loading}>
                    <SelectTrigger className="h-10">
                        <SelectValue placeholder="Not specified" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                    placeholder="Details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
        </form>
    )
}