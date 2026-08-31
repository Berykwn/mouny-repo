import type { TransactionWithDetails } from '@/types'

export function toCsv(rows: TransactionWithDetails[]): string {
    const header = ['Date', 'Type', 'Category', 'Note', 'Account', 'Amount']
    const escape = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const lines = rows.map(t => [
        t.date,
        t.type,
        t.category?.name ?? '',
        t.note ?? '',
        t.account.name,
        String(t.amount),
    ].map(v => escape(String(v))).join(','))
    return [header.join(','), ...lines].join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
