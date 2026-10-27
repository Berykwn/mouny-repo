// Date helpers on plain "YYYY-MM-DD" strings, done in UTC so a timezone never shifts a day.

const pad = (n: number) => String(n).padStart(2, '0')

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-10-27" plus 3 days → "2026-10-30"; negative days go back. */
export function addDays(date: string, days: number): string {
    const [y, m, d] = date.slice(0, 10).split('-').map(Number)
    const t = new Date(Date.UTC(y, m - 1, d + days))
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/** "Oct 2026". */
export function monthYearLabel(date: string): string {
    const [y, m] = date.slice(0, 10).split('-').map(Number)
    return `${MONTHS_SHORT[m - 1]} ${y}`
}

/** "October", or "October 2027" when it isn't this year (relative to `today`). */
export function monthLabel(date: string, today: string): string {
    const [y, m] = date.slice(0, 10).split('-').map(Number)
    const thisYear = Number(today.slice(0, 4))
    return y === thisYear ? MONTHS_LONG[m - 1] : `${MONTHS_LONG[m - 1]} ${y}`
}
