import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Loader2, CalendarIcon, ChevronDown, Check,
    Landmark, Wallet, TrendingUp, CircleDollarSign,
    ArrowDownCircle, Film, UtensilsCrossed, Truck,
    Gift, ShoppingCart, Heart, Home, Wifi, MoreHorizontal,
    Bike, ParkingCircle, ArrowUpCircle, ShoppingBag,
    RefreshCw, Shield, Car, Zap, Circle,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { transactionsService, type CreateTransactionInput } from '@/services/transactions.service'
import { accountsService, categoriesService } from '@/services/accounts-categories.service'
import { toISODate } from '@/lib/helpers'
import type { Account, Category } from '@/types'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface TransactionFormProps {
    payPeriodId: string
    periodStart: string
    periodEnd?: string
    defaultDate?: string
    onSuccess: () => void
}

type TxType = 'income' | 'expense'

type LucideComponent = React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>

const CATEGORY_ICON_MAP: Record<string, LucideComponent> = {
    'arrow-down-circle': ArrowDownCircle,
    'film': Film,
    'utensils-crossed': UtensilsCrossed,
    'truck': Truck,
    'gift': Gift,
    'shopping-cart': ShoppingCart,
    'heart': Heart,
    'home': Home,
    'wifi': Wifi,
    'more-horizontal': MoreHorizontal,
    'bike': Bike,
    'parking-circle': ParkingCircle,
    'arrow-up-circle': ArrowUpCircle,
    'shopping-bag': ShoppingBag,
    'refresh-cw': RefreshCw,
    'shield': Shield,
    'car': Car,
    'zap': Zap,
}

function getCategoryIcon(name: string): LucideComponent {
    return CATEGORY_ICON_MAP[name] ?? Circle
}

function getAccountIcon(type: string): LucideComponent {
    if (type === 'bank') return Landmark
    if (type === 'cash') return Wallet
    if (type === 'investment') return TrendingUp
    return CircleDollarSign
}

export function TransactionForm({ payPeriodId, periodStart, periodEnd, defaultDate, onSuccess }: TransactionFormProps) {
    const today = toISODate()
    const maxDate = periodEnd ?? today

    const resolveDate = (d?: string) => {
        const target = d ?? today
        if (target < periodStart) return periodStart
        if (target > maxDate) return maxDate
        return target
    }

    const [type, setType] = useState<TxType>('expense')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [date, setDate] = useState(resolveDate(defaultDate))
    const [accountId, setAccountId] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)
    const categoryScrollRef = useRef<HTMLDivElement>(null)

    const selectedAccount = accounts.find((a) => a.id === accountId)
    const selectedCategory = categories.find((c) => c.id === categoryId)

    useEffect(() => {
        setDate(resolveDate(defaultDate))
    }, [defaultDate])

    useEffect(() => {
        accountsService.getAll().then(({ data }) => {
            if (data) {
                setAccounts(data)
                setAccountId(data[0]?.id ?? '')
            }
        })
    }, [])

    useEffect(() => {
        categoriesService.getByType(type).then(({ data }) => {
            if (data && data.length > 0) {
                setCategories(data)
                setCategoryId(data[0].id)
            } else {
                setCategories([])
                setCategoryId('')
            }
        })
    }, [type])

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
        if (!accountId) {
            toast.error('Please select an account.')
            return
        }
        if (!categoryId) {
            toast.error('Please select a category.')
            return
        }
        if (date < periodStart) {
            toast.error(`Date cannot be before period start (${periodStart}).`)
            return
        }
        if (date > maxDate) {
            toast.error(`Date cannot be after period end (${maxDate}).`)
            return
        }

        setLoading(true)

        const input: CreateTransactionInput = {
            pay_period_id: payPeriodId,
            account_id: accountId,
            category_id: categoryId === 'none' ? undefined : categoryId,
            type,
            amount: parsed,
            note: note || undefined,
            date,
        }

        const { error } = await transactionsService.create(input)
        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success('Transaction saved successfully.')
        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 pb-2">

            {/* Tab Type */}
            <div className="relative flex rounded-xl bg-muted p-1 gap-1">
                <div
                    className={cn(
                        'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-background shadow-sm transition-transform duration-200 ease-out',
                        type === 'income' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                    )}
                />
                {(['expense', 'income'] as TxType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={cn(
                            'relative z-10 flex-1 py-2 text-[13px] font-medium rounded-lg transition-colors duration-150',
                            type === t ? 'text-foreground' : 'text-muted-foreground'
                        )}
                    >
                        {t === 'expense' ? 'Expense' : 'Income'}
                    </button>
                ))}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Amount
                </Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={displayAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="0"
                        disabled={loading}
                        className="pl-10 h-11 text-sm font-mono"
                    />
                </div>
            </div>

            {/* Account */}
            <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Account
                </Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            disabled={loading}
                            className="w-full flex items-center gap-3 px-3 h-14 rounded-xl border border-border bg-background text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                        >
                            {selectedAccount ? (() => {
                                const Icon = getAccountIcon(selectedAccount.type)
                                return (
                                    <>
                                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                            <Icon className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-foreground truncate">
                                                {selectedAccount.name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Rp {Number(selectedAccount.balance ?? 0).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    </>
                                )
                            })() : (
                                <span className="text-sm text-muted-foreground flex-1">Select account</span>
                            )}
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
                        {accounts.map((a) => {
                            const Icon = getAccountIcon(a.type)
                            return (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => setAccountId(a.id)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                                        accountId === a.id ? 'bg-amber-50 dark:bg-amber-950/20' : 'hover:bg-muted'
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                        <Icon className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-foreground truncate">{a.name}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Rp {Number(a.balance ?? 0).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                    {accountId === a.id && (
                                        <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </PopoverContent>
                </Popover>
            </div>

            {/* Category — horizontal scroll 1 baris */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                        Category
                    </Label>
                    {selectedCategory && (() => {
                        const Icon = getCategoryIcon(selectedCategory.icon ?? '')
                        return (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Icon className="w-3 h-3" style={{ color: selectedCategory.color ?? undefined }} />
                                {selectedCategory.name}
                            </span>
                        )
                    })()}
                </div>
                <div
                    ref={categoryScrollRef}
                    className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {categories.map((c) => {
                        const Icon = getCategoryIcon(c.icon ?? '')
                        return (
                            <button
                                key={c.id}
                                type="button"
                                disabled={loading}
                                onClick={() => setCategoryId(c.id)}
                                className={cn(
                                    'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-150 shrink-0 w-[72px]',
                                    categoryId === c.id
                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                                        : 'border-border bg-background'
                                )}
                            >
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: c.color ? `${c.color}20` : undefined }}
                                >
                                    <Icon
                                        className="w-4 h-4"
                                        style={{ color: c.color ?? undefined }}
                                    />
                                </div>
                                <span
                                    className={cn(
                                        'text-[10px] text-center leading-tight line-clamp-2 w-full',
                                        categoryId === c.id
                                            ? 'text-blue-700 dark:text-blue-300 font-medium'
                                            : 'text-muted-foreground'
                                    )}
                                >
                                    {c.name}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Date
                </Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'w-full justify-start text-left font-normal h-11 rounded-xl',
                                !date && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {date ? format(new Date(date + 'T00:00:00'), 'dd MMM yyyy') : 'Pick a date'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date ? new Date(date + 'T00:00:00') : undefined}
                            onSelect={(d) => {
                                if (!d) return
                                setDate(format(d, 'yyyy-MM-dd'))
                            }}
                            disabled={(d) =>
                                d < new Date(periodStart + 'T00:00:00') ||
                                d > new Date(maxDate + 'T00:00:00')
                            }
                        />
                    </PopoverContent>
                </Popover>
                <p className="text-[11px] text-muted-foreground">
                    {periodStart} — {maxDate}
                </p>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Note{' '}
                    <span className="normal-case tracking-normal font-normal">(optional)</span>
                </Label>
                <Input
                    type="text"
                    placeholder="Lunch, fuel, etc"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={loading}
                    className="h-11 rounded-xl"
                />
            </div>

            <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-semibold"
                disabled={loading}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
        </form>
    )
}