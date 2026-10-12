import type { TransactionWithDetails } from '@/types'

const escape = (v: string) => /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v

/** Free text starting with = + - @ runs as a formula in Excel/Sheets; a leading ' keeps it text. */
const text = (v: string) => /^[=+\-@]/.test(v) ? `'${v}` : v

/** The type in the ledger's words, so a sheet can tell savings from spending. */
function typeLabel(t: Pick<TransactionWithDetails, 'type' | 'category'>): string {
    if (t.type === 'income') return 'Income'
    if (t.type === 'expense') return t.category?.is_savings ? 'Saved' : 'Expense'
    if (t.type === 'transfer_in') return 'Transfer in'
    if (t.type === 'transfer_out') return 'Transfer out'
    return t.type
}

/** Oldest first, the order a spreadsheet reads naturally. */
export function toCsv(rows: TransactionWithDetails[]): string {
    const header = ['Date', 'Type', 'Category', 'Note', 'Account', 'Amount']
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) || (a.created_at ?? '').localeCompare(b.created_at ?? ''))
    const lines = sorted.map(t => [
        t.date,
        typeLabel(t),
        text(t.category?.name ?? ''),
        text(t.note ?? ''),
        text(t.account?.name ?? ''),
        String(t.amount),
    ].map(v => escape(String(v))).join(','))
    return [header.join(','), ...lines].join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
    // BOM so Excel on Windows reads the file as UTF-8 (em dashes in notes, etc.).
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Revoking right after click() can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
