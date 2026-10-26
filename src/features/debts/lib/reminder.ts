import { formatCurrency, formatDate } from '@/lib/helpers'
import type { DebtWithAccount } from '@/types'

/** A polite nudge to send the borrower, in the language most counterparties will read. */
export function reminderText(debt: Pick<DebtWithAccount, 'counterparty' | 'remaining_amount' | 'due_date'>): string {
    const due = debt.due_date ? ` yang jatuh tempo ${formatDate(debt.due_date)}` : ''
    return `Halo ${debt.counterparty}, sekadar mengingatkan soal pinjaman ${formatCurrency(debt.remaining_amount)}${due}. Kalau sudah longgar, kabari ya. Terima kasih!`
}

/** Opens the share sheet with the reminder, or WhatsApp where there's none; the user picks who. */
export async function sendReminder(debt: DebtWithAccount) {
    const text = reminderText(debt)
    if (navigator.share) {
        try {
            await navigator.share({ text })
            return
        } catch (err) {
            // The user closed the share sheet; anything else (blocked, unsupported) falls through.
            if (err instanceof DOMException && err.name === 'AbortError') return
        }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
