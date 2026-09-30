import type { TransactionWithDetails } from '@/types'

const escape = (v: string) => /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v

/** Free text starting with = + - @ runs as a formula in Excel/Sheets; a leading ' keeps it text. */
const text = (v: string) => /^[=+\-@]/.test(v) ? `'${v}` : v

export function toCsv(rows: TransactionWithDetails[]): string {
    const header = ['Date', 'Type', 'Category', 'Note', 'Account', 'Amount']
    const lines = rows.map(t => [
        t.date,
        t.type,
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
