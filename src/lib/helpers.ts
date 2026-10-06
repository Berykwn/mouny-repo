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
    // Keep a leading minus (balance adjustments) and ignore stray characters instead of showing NaN.
    const negative = MINUS.test(value.trim()[0] ?? '')
    const digits = value.replace(/\D/g, '')
    if (!digits) return negative ? '-' : ''
    return (negative ? '-' : '') + Number(digits).toLocaleString('id-ID')
}

export function parseCurrencyInput(value: string): number {
    if (!value) return 0
    return parseInt(value.replace(/\D/g, ''), 10) || 0
}

// Keyboards differ in what their minus key types: a hyphen, a real minus sign, or a dash.
const MINUS = /[-‐-―−﹣－]/

/**
 * What a signed rupiah field keeps as it's typed: digits, with a leading "-" when a minus
 * was typed anywhere in it. So "-" then "5000" and "5000" with "-" put in front (or at the
 * end) both read as -5000, and deleting the minus makes it positive again.
 */
export function toSignedDigits(value: string): string {
    const negative = MINUS.test(value)
    return (negative ? '-' : '') + value.replace(/\D/g, '')
}

/** A signed whole rupiah amount from a field like "-20.000"; 0 when there's no number. */
export function parseCurrencyWithSign(value: string): number {
    if (!value) return 0
    const digits = value.replace(/\D/g, '')
    if (!digits) return 0
    return (MINUS.test(value) ? -1 : 1) * parseInt(digits, 10)
}

/**
 * What a quantity field (grams, pcs) keeps as it's typed. A comma is the decimal
 * separator in Indonesian, so "0,5" means half, not 5; only the first separator counts.
 */
export function toDecimalInput(value: string): string {
    const cleaned = value.replace(/,/g, '.').replace(/[^0-9.]/g, '')
    const dot = cleaned.indexOf('.')
    return dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '')
}

/** A quantity from a toDecimalInput value; 0 when there's no number. */
export function parseDecimalInput(value: string): number {
    const n = Number(toDecimalInput(value))
    return Number.isFinite(n) ? n : 0
}

/**
 * A bare YYYY-MM-DD string is a local calendar date, but `new Date()` reads it as UTC
 * midnight — which is the previous day in time zones behind UTC. Timestamps pass through.
 */
function parseLocalDate(dateStr: string): Date {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr + 'T00:00:00') : new Date(dateStr)
}

export function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(parseLocalDate(dateStr))
}

export function formatDateShort(dateStr: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
    }).format(parseLocalDate(dateStr))
}

export function daysUntil(dateStr: string): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = parseLocalDate(dateStr)
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
    if (value < 0) return `-${formatCompact(-value)}`
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}m`
    if (value >= 1_000) return `${Math.round(value / 1_000)}k`
    return `${Math.round(value)}`
}

export function formatShortCurrency (value: number): string {
    if (value < 0) return `-${formatShortCurrency(-value)}`
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}jt`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
    return `${Math.round(value)}`
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
    const date = parseLocalDate(startDate)
    return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
}