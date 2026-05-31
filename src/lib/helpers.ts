export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export function formatCurrencyInput(value: string): string {
    if (!value) return ''
    return Number(value).toLocaleString('id-ID')
}

export function parseCurrencyInput(value: string): number {
    if (!value) return 0
    return parseInt(value.replace(/\D/g, ''), 10) || 0
}

export function parseCurrencyWithSign(value: string): number {
    if (!value) return 0
    return parseFloat(
        value.replace(/[^0-9,-]/g, '').replace(',', '.')
    ) || 0
}

export function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(dateStr))
}

export function formatDateShort(dateStr: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
    }).format(new Date(dateStr))
}

export function daysUntil(dateStr: string): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function spentPercent(spent: number, budget: number): number {
    if (budget === 0) return 0
    return Math.round((spent / budget) * 100)
}

export function toISODate(date: Date = new Date()): string {
    return date.toISOString().split('T')[0]
}

export function getDaysBetween(
  startDate: string | undefined,
  endDate: string = new Date().toISOString()
) {
  if (!startDate) return 0

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatShortCurrency (value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}jt`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
    return `${value}`
}

export function formatPeriodLabel(startDate: string | null): string {
    if (!startDate) return 'Period'
    const date = new Date(startDate)
    return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
}