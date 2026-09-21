# Handoff: Mouny — “Ledger lines” redesign (Dashboard + Transactions)

Paste this file to Claude Code as the brief. Everything below is self-sufficient.

## Overview

Mouny is a mobile-first personal-finance PWA built around **pay periods**: the user opens a period with an
estimated income, records transactions/debts/wishlist items during it, then closes it. Currency is Rupiah
with no decimals, locale `id-ID`, UI copy in English.

This handoff covers a **redesign of the two core surfaces — Dashboard and Transactions** — plus a new
**information architecture and navigation model** for the whole app. Everything else (Debts, Wishlist,
Accounts, Categories, Period History, Auth) keeps its current screens for now but must adopt the new shell.

Source repo the design was made from: `Berykwn/mouny-repo`, branch **`production`**.

## About the design files

Two HTML files ship with this bundle. They are **design references**, not production code:

| File | What it is |
| --- | --- |
| `Mouny Redesign.dc.html` | The target design. 5 phone screens at 390×844, side by side. |
| `Mouny Current UI.dc.html` | A 1:1 recreation of what `production` renders today, for before/after comparison. |

They are single-file HTML prototypes with inline styles. **Do not copy the markup.** Recreate the design in
the existing stack — React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui + Radix, lucide-react, Supabase —
using the project's established patterns (`features/<name>/index.tsx` + `components/`, `services/` layer,
hooks for local state, no global store).

## Fidelity

**High fidelity.** Colors, type sizes, spacing, and radii below are final. Match them. Where a value is not
listed, take it from the HTML file (all values are inline, so they are readable directly).

---

## 1. New information architecture

### Today's structure (to be replaced)

`components/layouts/app-layout/index.tsx` has a 5-item bottom bar (Dashboard, Transactions, Debts, Wishlist,
Accounts) at `h-[68px]`, plus a full-screen left `Sheet` hamburger holding a 7-item duplicate menu
(the same 5 + Categories + Period History) and Logout. The page title sits in the header next to the burger.
The active pay period is a large collapsible card at the top of the Dashboard.

### Target structure

Four tabs and a centre add button:

| Tab | Route | Contents |
| --- | --- | --- |
| **Today** | `/` | Redesigned dashboard: safe-to-spend, pace, balances, debts, breakdown |
| **Ledger** | `/transactions` | Calendar / Analytics / All — segmented under the page title |
| **(+) FAB** | — | Opens the Add Transaction bottom drawer. Not a route. |
| **Money** | `/money` | Hub for Accounts, Debts, Wishlist (each a section or sub-route) |
| **Menu** | `/menu` | Categories, Period History, theme, Logout — a plain list page, not a Sheet |

Rules:
- The **hamburger Sheet is removed.** Everything in it now lives under Money or Menu.
- The pay period is **no longer a card.** It becomes a quiet chip in the header of Today and Ledger:
  `● Jul period · day 27 / 31 ⌄`. Tapping it opens the existing period-picker `BottomDrawer`
  (period list, open/close period actions).
- `BottomDrawer` / `ConfirmDrawer` remain the pattern for all create/edit/delete. No modals, no full pages.

---

## 2. Design tokens

Keep the existing shadcn token layer in `src/index.css`; the design only adds a lime accent and a tighter
neutral ramp. Values below are the literal hex used in the mocks.

### Color

| Token | Hex | Use |
| --- | --- | --- |
| canvas | `#fafafa` | app background (`bg-neutral-50`) |
| surface | `#ffffff` | cards |
| border | `#e5e5e5` | card borders (`neutral-200`) |
| border-subtle | `#f4f4f2` | row dividers inside cards |
| track | `#f2f2f0` | progress/bar tracks |
| ink | `#252525` | primary text (`--foreground`) |
| ink-muted | `#8a8a84` | labels, captions |
| ink-faint | `#a3a3a3` / `#b0b0aa` | tertiary text, inactive tab icons |
| **lime (brand)** | `#6FA82B` | FAB, primary CTA, “on pace”, today marker |
| lime-ink | `#4d7a1d` | text on lime tints |
| lime-tint | `#f2f6ea` / `#f7faf2` | positive/pace backgrounds |
| lime-border | `#cfdcb8` / `#dfe8d2` | borders on lime tints |
| positive | `#059669` | income figures |
| negative | `#dc2626` | expense figures, over-budget (`--destructive`) |
| heat-low | `#c9d6b4` | calendar bar, low spend |
| heat-mid | `#e8973a` | calendar bar, ≥40 % of peak |
| heat-high | `#dc2626` | calendar bar, ≥70 % of peak |

Category colors come from `src/lib/static-colors.ts` as today. The mock uses
Food & Drink `#f97316`, Transport `#3b82f6`, Bills `#8b5cf6`, Shopping `#ec4899`, Health `#14b8a6`.
Category icon tints are the category color at `1f` alpha (`${color}1f`).

### Typography

**Barlow only** (`@fontsource/barlow`, already a dependency — `--font-sans` in `index.css`).
The earlier mock used a mono for figures; that was dropped. All numeric runs get
`font-variant-numeric: tabular-nums` (`tabular-nums` in Tailwind) so columns align.

| Role | Size / weight | Notes |
| --- | --- | --- |
| Hero figure | 38px / 500, `letter-spacing:-.03em` | safe-to-spend |
| Net figure | 32px / 500, `-.02em` | analytics net |
| Amount field | 34px / 500 | add-transaction amount |
| Page title | 20px / 600, `-.02em` | “Ledger” |
| Card figure | 15px / 500 | stat values, balances |
| Section label | 11px / 400, `letter-spacing:.14em`, uppercase, ink-muted | “SAFE TO SPEND”, “PACE” |
| Body / row | 13–13.5px / 400–500 | list rows |
| Caption | 10.5–11.5px | subs, meta |
| Tab label (nav) | 10px, 600 when active | |

### Geometry

- Radius: cards **20px**, inner blocks/buttons **12–14px**, chips **10px**, pills **999px**, icon tiles **10–11px**.
- Screen padding: `20px` horizontal (was 16px).
- Card padding: 18–22px.
- Vertical gap between cards: **12px**.
- Bottom nav height: **76px** (was 68px). FAB 54px circle, `margin-top:-26px`, shadow
  `0 8px 18px -6px rgba(111,168,43,.7)`.
- Card shadow: none. Cards are defined by the 1px border only.

### Icons

`lucide-react`, `strokeWidth` 2 (nav inactive 2, active 2). Icons used: `House`, `List`, `Wallet`,
`Ellipsis`, `Plus`, `ChevronDown`, `ChevronsUpDown`, `ArrowRight`, `Minus`, `Calendar`, `CalendarDays`,
`Pencil`, `Building`, `Banknote`, `CircleCheck`, `Coins`, plus the existing `ICON_MAP` in
`src/lib/icon-map.ts` for categories. Sizes: nav 20px, inline 13–16px.

---

## 3. Screens

### 3.1 Today (`/`) — replaces `features/dashboard`

Header (`padding:22px 20px 12px`, canvas background, not sticky):
- Row 1: lime coin mark + wordmark **“Mouny.”** 16px/600 on the left; on the right a 32px circle outline
  button (Coins → `/money`) and a 32px `#252525` avatar circle with initials, 11.5px/600 `#fafafa`.
- Row 2: the **period chip** — `padding:6px 10px 6px 8px`, radius 999px, white, 1px `#e5e5e5` border:
  6px lime dot · “Jul period” 12px/500 · “day 27 / 31” 11px ink-muted tabular · `ChevronDown` 13px.
  Tap → period picker drawer.

Scroll body, `padding:4px 20px 28px`, `gap:12px`:

1. **Safe to spend** (card, `padding:22px 20px`)
   - Label “SAFE TO SPEND”. Figure 38px/500.
   - Value = `expected_or_actual_income − total_expense` for the active period (the current
     `remaining = totalIncome − totalExpense`). Negative → figure in `#dc2626`.
   - Bar: 6px tall, radius 999px, track `#f2f2f0`; filled portion = `spentPercent`, `#252525`,
     then a 1px white gap, then the remainder in `#e3e8db`.
   - Under it, two 11.5px captions justified: `Spent {formatCurrency(totalExpense)}` and
     `of {income} in`.
2. **Pace** (card, `padding:18px 20px`) — new
   - Header row: “PACE” label + status pill (lime tint, 5px dot, 10.5px/600 lime-ink):
     `Under budget` when `dailyAvg <= safeDaily`, else `Over pace` (use `#fef2f2` / `#b91c1c`).
   - Sparkline: last 14 days of expense as `flex` bars, 44px tall box, `gap:3px`, radius 2px,
     `#dcdcd9`, **today's bar `#252525`**; each height = `max(3, round(v / max * 44))`.
   - 1px `#eeeeec` rule, then two figures: left “Your daily avg” = `totalExpense / daysElapsed`;
     right “Safe daily, N days left” = `remaining / daysRemaining`, in lime-ink.
   - Footer note, 11.5px, `border-left:2px solid #6FA82B; padding-left:10px`:
     “At this pace the period closes about **{projectedRemaining}** ahead.”
     `projectedRemaining = income − dailyAvg × totalDays`. If negative, say “short” and use `#dc2626`.
   - `daysRemaining` needs a period end date. If `pay_periods.end_date` is null, derive the expected end
     from the previous period's length, or hide the safe-daily/projection halves and show only the average.
3. **Balances** (card, `padding:18px 0 16px`)
   - Header row (`padding:0 20px 14px`): “BALANCES” + total (13px/500) + `ArrowRight` 13px → `/money`.
   - One row per account: `padding:9px 20px`, `border-top:1px solid #f4f4f2`, 15px type icon
     (`AccountTypeIcon`, `#a3a3a3`), name 13.5px, balance 13.5px tabular right-aligned.
4. **Debts** (card, `padding:18px 20px`)
   - Header: “DEBTS” + `net {formatCurrency(receivable − owed)}` — sign-colored.
   - Two-sided bar 6px: owed share `#dc2626`, 2px white gap, receivable share `#059669`.
   - Two figures: “You owe” (`#dc2626`) / “Owed to you” (`#059669`), 14px/500 tabular.
5. **Where it went** (card, `padding:18px 20px 16px`)
   - Top 5 expense categories by amount. Per row: name 13px, percent 11px `#a3a3a3`,
     amount 13px tabular; below it a 2px track with the category-colored fill
     (fill width is scaled so the largest category reads full — `pct × 3.4%` in the mock).

**Empty state** (no active period) — screen 5 in the file. Vertically centred, `padding:0 28px 60px`,
`gap:22px`: 52px lime-tint rounded square with `CalendarDays`; H2 24px/600 “Open a period to start tracking”;
14px/1.6 explainer; an “EXPECTED INCOME” card with a `Rp 0` placeholder; 52px lime CTA
“Open period →”; then “or review 3 closed periods” (underlined) 12.5px centred.

### 3.2 Ledger (`/transactions`) — replaces `features/transactions`

Header: title “Ledger” 20px/600 + period chip (same chip, `ChevronsUpDown` variant).
Below it an **underline tab row**, not the current filled `TabsList`: `gap:22px`,
`border-bottom:1px solid #e5e5e5`, active item `border-bottom:2px solid #252525; margin-bottom:-1px`
with 14px/600 label; inactive 14px `#9a9a94`. Tabs: **Calendar · Analytics · All**.
(`All` is a flat, searchable list of the period's transactions — not designed yet, ship Calendar +
Analytics first and keep the swipe-between-tabs gesture from `useSwipeable`.)

#### Calendar tab — two view modes

A **Month / Days** segmented switch lives in the calendar card header
(`padding:2px`, radius 9px, `#f4f4f2`; active chip white, radius 7px, `0 1px 2px rgba(0,0,0,.06)`,
11px/600; inactive 11px ink-muted). Persist the choice per user (localStorage is fine).

**Mode A — Month** (card `padding:18px 16px 16px`)
- Header: “1 – 31 JUL” label + “tallest day 850k” caption + the mode switch.
- Weekday row: 7 columns, 9.5px `#b0b0aa`, single letters `S M T W T F S`.
- Grid: 7 columns, `gap:5px`, one cell per date in the period, leading blanks for
  `new Date(periodStart).getDay()`. Each cell is `aspect-ratio:1`, radius 9px,
  `flex-direction:column; justify-content:space-between; align-items:center`, `padding:4px`:
  - day number 9.5px tabular at the top,
  - **a bottom-anchored bar whose height encodes that day's expense** —
    `max(3, round(expense / maxExpense * 26))px`, width 70%, radius `2px 2px 1px 1px`,
    color heat-low / heat-mid (≥.4) / heat-high (≥.7). Days with no expense get a 2px `#f2f2f0` stub.
  - Past day: background `#fbfbfa`, border `#f2f2f0`. Future day: transparent, number `#d4d4ce`.
    **Today / selected: background `#f2f6ea`, border `1px solid #6FA82B`, number lime-ink 600.**
- This replaces the current fully-filled heat cells + the low→high legend, which read as a
  color puzzle; height is the quantity, color is only severity.

**Mode B — Days** (horizontally scrolling rail)
- Same card, but instead of the grid a single-row rail: `display:flex; gap:7px; overflow-x:auto`,
  `padding:2px 18px 4px`, scrollbar hidden, snap to items, auto-scrolled to the selected day.
- Each pill: 46px wide, `flex-shrink:0`, radius 14px, border `1px solid #f0f0ee`, white,
  `padding:9px 0 7px`, column layout `gap:5px`: weekday letter 9.5px `#b0b0aa`,
  day number 16px/600 tabular, then a 14px-wide spend bar in a 26px-tall box (same heat scale).
- Selected pill: background `#252525`, border `#252525`, number `#fafafa`, weekday
  `rgba(250,250,250,.6)`, bar `#a3d16a`.
- Caption under the header: “swipe the rail, tap a day”.

**Selected-day card** (both modes, `border-radius:20px`, `overflow:hidden`)
- Header `padding:16px 20px 14px`, space-between:
  - left: weekday + date 14px/600 (`toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'})`),
    then meta 11px: “{n} transactions · **−{expense total}**” (total in `#dc2626`; if the day has income,
    append “ · +{income}” in `#059669`).
  - right: a compact **`+ Add`** pill — `padding:7px 11px 7px 9px`, radius 10px,
    background `#f7faf2`, border `1px solid #cfdcb8`, `Plus` 13px + 12px/600 lime-ink.
- **The add action must stay in this header.** In the previous design it was a full-width button *below*
  the transaction list, so on a busy day the user had to scroll past every row to reach it. Header
  placement keeps it fixed regardless of list length; the nav FAB stays as the global “add anywhere”.
- Rows: `padding:11px 20px`, `border-top:1px solid #f4f4f2`. 32px category tile (radius 10px,
  `${color}1f` background, 15px `ICON_MAP` icon in the category color), title 13.5px/500
  (`note || category.name`), meta 11px ink-muted (`category · account`), amount 13.5px tabular
  right-aligned — expenses ink, income `#059669` with `+`.
- Long-press or swipe a row for delete → existing `ConfirmDrawer`. The always-visible trash icon
  from the current build is dropped.
- No transactions: single 12px ink-muted line “No transactions this day.” in the body.

#### Analytics tab

1. **Net this period** card (`padding:20px`): label, figure 32px/500 with `+`/`−`,
   then a 2-column split over a 1px `#f2f2f0` rule: “In” (15px/500 `#059669`) / “Out” (15px/500 ink,
   right-aligned).
2. **Where it went** card: header “WHERE IT WENT” + caption “tap − to exclude”; a 5px stacked
   ribbon (`gap:2px`, per-category width = share, remainder `#f2f2f0`); then one row per category
   (`padding:10px 20px`, `border-top:1px solid #f4f4f2`): 7px dot, name 13.5px, percent 11px
   `#a3a3a3` (width 30px, right), amount 13.5px tabular (width 78px, right), and a 22px circular
   toggle (`border:1px solid #e5e5e5`) with `Minus`. Keep the existing exclude/include behavior from
   `period-analytics.tsx`: excluded rows drop to 30 % opacity, show `—` for percent, and are removed
   from the active total and every stat below.
3. **Stats** card: a **2-column grid**, `gap:16px 12px`, replacing the long single-column row list.
   Each cell: 10.5px label, 15px/500 tabular value, 10.5px `#b0b0aa` sub. Cells: Daily average
   (`over N days`), Days left (`of N`), Biggest day (date — tappable, opens the existing day sheet),
   Biggest expense (note or category), Transactions (`N out · N in`), No-spend days.
   Header reads “Stats (filtered)” while any category is excluded.
4. **Projection** card — lime tint (`background:#f7faf2`, `border:1px solid #dfe8d2`), label in lime-ink:
   Projected spend, Projected close, Runway at this pace. Render only when the period has an end date
   and income > 0 (same guard as `hasPredictive` today).

### 3.3 Add Transaction drawer

`BottomDrawer`, radius `24px 24px 0 0`, `max-height:92%`, 36px grab handle, title
“New transaction” 17px/600, close button a 30px `#f4f4f2` circle. All fields visible at once —
no wizard, no keypad screen. Body `padding:0 20px 20px`, `gap:18px`:

1. **Type** segmented control: radius 12px, `#f4f4f2`, `padding:3px`; three equal items
   **Expense · Income · Transfer** (Transfer is new — route it to the existing account-transfer flow);
   active item white, radius 9px, `0 1px 2px rgba(0,0,0,.06)`, 13px/600.
2. **Amount**: “AMOUNT” label, then `Rp` 20px `#b0b0aa` + the value 34px/500 on a
   `border-bottom:1px solid #e5e5e5` — no boxed input. Digits only, thousand-separated with
   `formatCurrencyInput`.
3. **Category**: horizontal scroll of 74px tiles (`padding:11px 6px`, radius 14px,
   border `#eeeeec`): 34px `${color}1f` tile with the icon, then the name 10px centred.
   Selected tile: `border:1px solid #6FA82B`, `background:#f7faf2`, label lime-ink 600.
4. **Account / Date / Note** as three compact rows, `padding:13px 0`, separated by
   `1px solid #f2f2f0`: 16px leading icon, label 13px ink-muted, value 13.5px/500 right-aligned
   (+ account balance 11.5px `#b0b0aa`), `ChevronDown` 14px. Account opens the existing
   `Popover` picker; Date opens the existing `Calendar` popover clamped to the period range;
   Note is inline text.
5. **Live consequence** strip: `background:#f7faf2`, radius 12px, `padding:12px 14px`,
   `CircleCheck` 15px lime + 12px lime-ink text — “Leaves **{safeToSpend − amount}** safe to spend
   this period.” Recompute as the amount changes; if it would go negative, switch to `#fef2f2` /
   `#b91c1c` and say “Puts you **{x}** over.”
6. **Actions**, side by side, 52px, radius 14px: “Save & add another” (outline, `#e5e5e5` border,
   14px/600 `#5b5b55`) and “Save” (lime `#6FA82B`, white). “Save & add another” keeps the drawer open,
   resets amount + note, and preserves type/category/account/date.

Validation stays as `transaction-form.tsx` has it (amount > 0, account required, category required,
date within `periodStart…maxDate`) with `sonner` toasts.

---

## 4. State & data

No new tables. Everything comes from the existing services:

| Screen | Calls |
| --- | --- |
| Today | `payPeriodsService.getActive()` + `getAll()`, `transactionsService.getByPeriod()` (current + previous), `debtsService.getActive()`, `accountsService.getAll()` |
| Ledger | `payPeriodsService.getAll()`, `transactionsService.getByPeriod()` |
| Add drawer | `accountsService.getAll()`, `categoriesService.getByType(type)`, `transactionsService.create()` |

Derived values to compute client-side (most already exist in `overview-tab.tsx` /
`period-analytics.tsx` — move them into a `usePeriodStats(periodId)` hook so Today and Ledger share one
implementation):

```
remaining        = totalIncome − totalExpense
spentPercent     = min(round(totalExpense / totalIncome × 100), 100)
daysElapsed      = max(1, getDaysBetween(period.start_date))
daysRemaining    = max(0, totalDays − daysElapsed)          // needs end_date
dailyAvg         = totalExpense / daysElapsed
safeDaily        = daysRemaining > 0 ? remaining / daysRemaining : null
projectedSpend   = dailyAvg × totalDays
projectedClose   = totalIncome − projectedSpend
runwayDays       = dailyAvg > 0 ? floor(remaining / dailyAvg) : null
noSpendDays      = daysElapsed − distinct expense dates
```

Component state: `activeTab` ('calendar' | 'analytics' | 'all'), `calendarMode` ('month' | 'days',
persisted), `selectedDate` (drives both the day card and the drawer's default date — already wired),
`excludedCategoryIds: Set<string>`, `drawerOpen`, `periodPickerOpen`, `deletingId`.

The **health score** widget (`calculate-health-score.ts`) and the spending-trend table are **not** in the
new Today. Keep the module; surface it later under Menu → Insights or drop it. Don't re-add it to Today.

## 5. Behavior notes

- Loading: keep `LoadingContent` skeletons.
- Transitions: 150–200ms, `ease-out`. Segmented/tab switches animate the active pill only; the
  Days rail scrolls with `scroll-behavior:smooth` and `scroll-snap-type:x mandatory`.
- The bottom nav does not change appearance on scroll (drop the current `scrolled` border toggle) —
  it is always white with a `1px #e5e5e5` top border.
- Respect `env(safe-area-inset-bottom)` on the nav, as today.
- Dark mode is **out of scope for this pass**; light only. Keep the `.dark` tokens intact and don't
  regress them.
- Accessibility: every tap target ≥44px (the `+ Add` pill is 34px tall — give it a padded hit area);
  the calendar cells rely on both height and color, never color alone.

## 6. Assets

No new assets. Icons are `lucide-react` (already installed). The lime coin mark in the mock is a
placeholder — a circle with a crescent bite, drawn as a CSS `radial-gradient` mask — and should be
replaced by the real mark when it exists. The current `app-logo.tsx` bird SVG is not used in these screens.

## 7. Files in this bundle

- `Mouny Redesign.dc.html` — the target design (5 screens: Today, Ledger·Calendar Month,
  Ledger·Calendar Days, Ledger·Analytics, Add transaction, Empty state).
- `Mouny Current UI.dc.html` — recreation of `production` today.

Open either in a browser. All styling is inline, so any value not written above can be read straight off
the element.

## 8. Suggested order of work

1. New `app-layout`: 4-tab nav + FAB, remove the Sheet, add `/money` and `/menu` shells.
2. `usePeriodStats` hook extracted from `overview-tab.tsx` + `period-analytics.tsx`.
3. Period chip + period-picker drawer.
4. Today screen (5 cards) and its empty state.
5. Ledger shell with underline tabs; Calendar Month mode; then Days mode.
6. Selected-day card with the header `+ Add`.
7. Analytics tab.
8. Add Transaction drawer, including “Save & add another” and the live consequence strip.
