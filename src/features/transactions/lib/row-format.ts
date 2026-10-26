import { isTransfer } from '@/lib/transaction-type'
import type { TransactionWithDetails } from '@/types'
import { entryTime } from './ledger'

const NUMBER = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

/** An amount as rows show it: "38.000", the currency left to the page. */
export const formatAmount = (n: number) => NUMBER.format(Math.round(n))

/** A signed day or search total: "−58.000", "+500.000". */
export const formatNet = (n: number) => `${n < 0 ? '−' : n > 0 ? '+' : ''}${formatAmount(Math.abs(n))}`

/** "Today", "Yesterday", or "Sat 18 Oct". */
export function dayLabel(date: string): string {
    const d = new Date(date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

interface MetaOptions {
    /** The account on a transfer's other side, when the list shows the transfer as one row. */
    otherSide?: string
    /** Search results aren't grouped by day, so each row says its own. */
    withDate?: boolean
}

/**
 * The small line under a row's note: "Food · BCA · 12:40", or "Transfer · BCA → GoPay".
 * With no note the category is already the title, so it isn't said twice.
 */
export function rowMeta(tx: TransactionWithDetails, { otherSide, withDate }: MetaOptions = {}): string {
    const when = withDate ? dayLabel(tx.date) : entryTime(tx)
    if (isTransfer(tx.type)) {
        const route = otherSide
            ? `${tx.account.name} → ${otherSide}`
            : tx.type === 'transfer_in' ? `Into ${tx.account.name}` : `From ${tx.account.name}`
        return [tx.note ? 'Transfer' : null, route, when].filter(Boolean).join(' · ')
    }
    return [tx.note && tx.category ? tx.category.name : null, tx.account.name, when].filter(Boolean).join(' · ')
}
