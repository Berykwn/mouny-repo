import { useMemo, useState } from 'react'
import { toISODate } from '@/lib/helpers'

export interface PeriodWeek {
    index: number
    start: string
    end: string
}

function addDaysISO(iso: string, days: number): string {
    const d = new Date(iso + 'T00:00:00')
    d.setDate(d.getDate() + days)
    return toISODate(d)
}

export function buildPeriodWeeks(periodStart: string, periodEnd: string | null): PeriodWeek[] {
    const effectiveEnd = periodEnd ?? toISODate()
    if (effectiveEnd < periodStart) return [{ index: 0, start: periodStart, end: periodStart }]

    const weeks: PeriodWeek[] = []
    let cursor = periodStart
    let index = 0
    while (cursor <= effectiveEnd) {
        const rawEnd = addDaysISO(cursor, 6)
        weeks.push({ index, start: cursor, end: rawEnd > effectiveEnd ? effectiveEnd : rawEnd })
        cursor = addDaysISO(cursor, 7)
        index++
    }
    return weeks
}

export function useWeekSelector(periodStart: string, periodEnd: string | null) {
    const weeks = useMemo(() => buildPeriodWeeks(periodStart, periodEnd), [periodStart, periodEnd])

    const defaultIndex = useMemo(() => {
        const today = toISODate()
        const containing = weeks.findIndex(w => today >= w.start && today <= w.end)
        return containing >= 0 ? containing : weeks.length - 1
    }, [weeks])

    const [weekIndex, setWeekIndex] = useState(defaultIndex)
    const clampedIndex = Math.min(weekIndex, weeks.length - 1)
    const currentWeek = weeks[clampedIndex] ?? weeks[weeks.length - 1]

    return {
        weeks,
        weekIndex: clampedIndex,
        currentWeek,
        goToPrev: () => setWeekIndex(i => Math.max(0, i - 1)),
        goToNext: () => setWeekIndex(i => Math.min(weeks.length - 1, i + 1)),
        canGoPrev: clampedIndex > 0,
        canGoNext: clampedIndex < weeks.length - 1,
    }
}
