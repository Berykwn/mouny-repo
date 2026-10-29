import { lazy, Suspense, type ComponentProps } from "react"
import type { Calendar as CalendarView } from "./calendar-view"

// The date picker (react-day-picker and date-fns) only shows when someone opens it, so it
// loads then instead of with every form that has one. The placeholder holds about its size,
// so the popover doesn't jump when it arrives.
const LazyCalendar = lazy(() => import("./calendar-view").then((m) => ({ default: m.Calendar })))

function Calendar(props: ComponentProps<typeof CalendarView>) {
  return (
    <Suspense fallback={<div aria-busy="true" className="w-[248px] h-[300px]" />}>
      <LazyCalendar {...props} />
    </Suspense>
  )
}

export { Calendar }
