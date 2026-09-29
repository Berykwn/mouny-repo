export function heatBarColor(ratio: number): string {
    if (ratio >= 0.7) return '#dc2626'
    if (ratio >= 0.4) return '#e8973a'
    return '#c9d6b4'
}

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

/**
 * The calendar date (YYYY-MM-DD) in the user's local time zone. Not `toISOString()`:
 * that is UTC, which in WIB turns local midnight into the previous day.
 */
export function toISODate(date: Date = new Date()): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

/** Days since the Unix epoch for the YYYY-MM-DD part of a date string, time zone ignored. */
function toDayNumber(dateStr: string): number {
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
    return Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24)
}

/** Whole calendar days from `startDate` to `endDate` (default: today, local). */
export function getDaysBetween(
  startDate: string | undefined,
  endDate: string = toISODate()
) {
  if (!startDate) return 0

  const days = toDayNumber(endDate) - toDayNumber(startDate)
  return Number.isNaN(days) ? 0 : days
}

export function formatCompact(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}m`
    if (value >= 1_000) return `${Math.round(value / 1_000)}k`
    return `${Math.round(value)}`
}

export function formatShortCurrency (value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}jt`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
    return `${value}`
}

export function getInitials(user: { user_metadata?: { full_name?: string } | null; email?: string | null } | null): string {
    const fullName = user?.user_metadata?.full_name
    if (fullName) {
        return fullName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part[0]?.toUpperCase() ?? '')
            .join('')
    }
    return user?.email ? user.email[0].toUpperCase() : '?'
}

export function formatPeriodLabel(startDate: string | null): string {
    if (!startDate) return 'Period'
    const date = new Date(startDate)
    return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
}