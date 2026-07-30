import { useEffect, useState } from 'react'
import { transactionsService, type CreateTransactionInput } from '@/services/transactions.service'
import { accountsService, categoriesService } from '@/services/accounts-categories.service'
import { parseCurrencyInput, toISODate } from '@/lib/helpers'
import type { Account, Category } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AmountStep } from './amount-step'
import { DetailsStep } from './details-step'

interface AddTransactionFlowProps {
    payPeriodId: string
    periodStart: string
    periodEnd?: string
    defaultDate?: string
    onClose: () => void
    onSuccess: () => void
}

type TxType = 'income' | 'expense'

export function AddTransactionFlow({ payPeriodId, periodStart, periodEnd, defaultDate, onClose, onSuccess }: AddTransactionFlowProps) {
    const today = toISODate()
    const maxDate = periodEnd ?? today

    const resolveDate = (d?: string) => {
        const target = d ?? today
        if (target < periodStart) return periodStart
        if (target > maxDate) return maxDate
        return target
    }

    const [mounted, setMounted] = useState(false)
    const [viewportHeight, setViewportHeight] = useState<number | null>(null)
    const [step, setStep] = useState<1 | 2>(1)
    const [type, setType] = useState<TxType>('expense')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [date, setDate] = useState(resolveDate(defaultDate))
    const [accountId, setAccountId] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const raf = requestAnimationFrame(() => setMounted(true))
        document.body.style.overflow = 'hidden'
        return () => {
            cancelAnimationFrame(raf)
            document.body.style.overflow = ''
        }
    }, [])

    // Mobile browsers keep `fixed` elements pinned to the layout viewport when
    // the on-screen keyboard opens, so the sheet doesn't shrink and its bottom
    // (Note field, Save button) ends up hidden behind the keyboard. Tracking
    // the visual viewport lets us shrink the sheet to what's actually visible.
    useEffect(() => {
        const vv = window.visualViewport
        if (!vv) return
        const update = () => setViewportHeight(vv.height)
        update()
        vv.addEventListener('resize', update)
        return () => vv.removeEventListener('resize', update)
    }, [])

    useEffect(() => {
        setDate(resolveDate(defaultDate))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultDate, periodStart, maxDate])

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

    const handleSubmit = async () => {
        const parsed = parseCurrencyInput(amount)
        if (!amount || parsed <= 0) {
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
        <div
            className={cn(
                'fixed inset-x-0 top-0 z-50 bg-white flex flex-col pt-[env(safe-area-inset-top)] h-[100dvh]',
                'transition-transform duration-300 ease-out',
                mounted ? 'translate-y-0' : 'translate-y-full'
            )}
            style={viewportHeight != null ? { height: viewportHeight } : undefined}
        >
            {step === 1 ? (
                <AmountStep
                    type={type}
                    amount={amount}
                    onTypeChange={setType}
                    onAmountChange={setAmount}
                    onNext={() => setStep(2)}
                    onClose={onClose}
                />
            ) : (
                <DetailsStep
                    type={type}
                    amount={amount}
                    accounts={accounts}
                    accountId={accountId}
                    onAccountChange={setAccountId}
                    categories={categories}
                    categoryId={categoryId}
                    onCategoryChange={setCategoryId}
                    date={date}
                    periodStart={periodStart}
                    maxDate={maxDate}
                    onDateChange={setDate}
                    note={note}
                    onNoteChange={setNote}
                    onBack={() => setStep(1)}
                    onSubmit={handleSubmit}
                    loading={loading}
                />
            )}
        </div>
    )
}
