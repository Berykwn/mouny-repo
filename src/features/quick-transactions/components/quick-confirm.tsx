import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountTypeTile } from '@/components/account-type-icon'
import { AccountPickerDrawer } from '@/components/account-picker-drawer'
import { CategoryTile } from '@/features/categories/components/category-icon'
import { useAccounts } from '@/queries'
import { useSeedOnce } from '@/hooks/use-seed-once'
import { quickTransactionsService } from '@/services/quick-transactions.service'
import { accountsService } from '@/services/accounts-categories.service'
import { ShortfallPanel } from '@/features/transactions/components/shortfall-panel'
import { shortfallFor } from '@/features/transactions/lib/shortfall'
import { formatCurrency, toISODate } from '@/lib/helpers'
import { defaultAccount } from '@/lib/account-roles'
import { accountSubline, overspendMessage, spendErrorMessage } from '@/lib/account-spend'
import type { Account, PayPeriod, QuickTransactionWithCategory } from '@/types'
import { shortDate } from '@/features/bills/lib/bill-labels'
import { quickName } from '../lib/quick-name'
import { BusyLabel } from '@/components/busy-label'

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[.14em] text-muted-ink'
const NO_ACCOUNTS: Account[] = []

interface QuickConfirmProps {
    quick: QuickTransactionWithCategory
    period: Pick<PayPeriod, 'id' | 'start_date'>
    onDone: () => void
    /** Shown inside the add form: go back to the full form. */
    onBack?: () => void
}

/** The amount and category are set; only the account and an optional note are asked. Dated today. */
export function QuickConfirm({ quick, period, onDone, onBack }: QuickConfirmProps) {
    const today = toISODate()
    const date = today < period.start_date ? period.start_date : today
    const isIncome = quick.category.type === 'income'
    const [accountId, setAccountId] = useState(quick.last_account_id ?? '')
    const [note, setNote] = useState('')
    const [pickerOpen, setPickerOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [toppingUp, setToppingUp] = useState(false)

    const { data: accountsData } = useAccounts()
    const accounts = accountsData ?? NO_ACCOUNTS
    // The account this quick amount was last paid with, while it still exists; else the default.
    useSeedOnce(accountsData, data => {
        if (!data.some(a => a.id === quick.last_account_id)) setAccountId(defaultAccount(data)?.id ?? '')
    })
    const account = accounts.find(a => a.id === accountId)
    // More than the account shows: a way on rather than a refusal (see ShortfallPanel).
    const shortfall = account && !isIncome ? shortfallFor(account, quick.amount, accounts) : null

    /** Moves the panel's round top-up in, dated with the entry, then saves. */
    const topUpAndSave = async () => {
        if (!shortfall?.source || shortfall.topUp === null) return
        const { source, account: short, topUp } = shortfall
        setLoading(true)
        setToppingUp(true)
        const { error } = await accountsService.transfer(source.id, short.id, topUp, date, 'Top up')
        setToppingUp(false)
        setLoading(false)
        if (error) { toast.error(spendErrorMessage(error, source)); return }
        toast.success(`Moved ${formatCurrency(topUp)} from ${source.name} to ${short.name}.`)
        // The cached balance catches up a moment later; the database checks the money itself.
        await save({ toppedUp: true })
    }

    const save = async ({ toppedUp = false } = {}) => {
        if (!account) { toast.error('Please select an account.'); return }
        const overspent = isIncome || toppedUp ? null : overspendMessage(account, quick.amount)
        if (overspent) { toast.error(overspent); return }
        setLoading(true)
        const { error } = await quickTransactionsService.record({ quick, account_id: account.id, note, date, pay_period_id: period.id })
        setLoading(false)
        if (error) {
            toast.error(spendErrorMessage(error, account))
            return
        }
        toast.success(`${quickName(quick)} ${formatCurrency(quick.amount)} saved.`)
        onDone()
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[20px] border border-line bg-surface p-4">
                <CategoryTile category={quick.category} className="w-11 h-11 rounded-[13px]" />
                <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-muted-ink truncate">{quick.category.name} · Today, {shortDate(date)}</p>
                    <p className={isIncome ? 'text-[22px] font-medium tracking-[-0.02em] text-positive' : 'text-[22px] font-medium tracking-[-0.02em] text-ink'}>
                        {isIncome ? '+' : ''}{formatCurrency(quick.amount)}
                    </p>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label id="quick-pick-label" className={FIELD_LABEL}>{isIncome ? 'Into' : 'Pay with'}</Label>
                <button
                    id="quick-pick"
                    aria-labelledby="quick-pick-label quick-pick"
                    type="button"
                    disabled={loading}
                    onClick={() => setPickerOpen(true)}
                    className="w-full flex items-center justify-between px-3 h-[52px] rounded-[14px] border border-line bg-surface text-left transition-colors hover:bg-surface-soft disabled:opacity-50 disabled:pointer-events-none"
                >
                    {account ? (
                        <div className="flex items-center gap-3 min-w-0">
                            <AccountTypeTile type={account.type} savings={account.is_savings} role={account.role} />
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-ink truncate">{account.name}</p>
                                <p className="text-[11.5px] text-muted-ink">{accountSubline(account)}</p>
                            </div>
                        </div>
                    ) : (
                        <span className="text-[13px] text-muted-ink">Select account</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-subtle-ink shrink-0" />
                </button>
                <AccountPickerDrawer
                    open={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    accounts={accounts}
                    selectedId={accountId}
                    onSelect={(a) => { setAccountId(a.id); setPickerOpen(false) }}
                />
            </div>

            {shortfall && (
                <ShortfallPanel shortfall={shortfall} then="save" onTopUp={() => void topUpAndSave()} busy={loading} toppingUp={toppingUp} />
            )}

            <div className="space-y-1.5">
                <Label htmlFor="quick-note" className={FIELD_LABEL}>Note <span className="normal-case tracking-normal font-normal">(optional)</span></Label>
                <Input
                    id="quick-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={quickName(quick)}
                    disabled={loading}
                    className="h-11 rounded-[12px] border-line text-[13.5px]"
                />
            </div>

            <div className="flex gap-2.5">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={loading}
                        className="flex-1 h-12 rounded-[14px] border border-line text-[13px] font-semibold text-muted-ink hover:bg-surface-soft transition-colors disabled:opacity-50"
                    >
                        Back
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={loading}
                    className="flex-[2] h-12 rounded-[14px] text-[13px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors disabled:opacity-50"
                >
                    <BusyLabel busy={loading} className="mx-auto">Save</BusyLabel>
                </button>
            </div>
        </div>
    )
}
