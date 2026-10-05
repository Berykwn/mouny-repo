# Mouny

A personal finance app built around **pay periods**: from one payday to the next, it shows what you've spent, what's left, and whether you're on pace. It covers accounts, a transaction ledger, category budgets, debts and receivables, and a savings wish list.

Mouny is a mobile-first installable PWA that also has a full desktop layout. It runs on React and Supabase. Amounts are shown in Indonesian rupiah (Rp).

Current version: **1.14.2**. See [CHANGELOG.md](CHANGELOG.md) for release notes.

---

## Features

**Overview (dashboard)**
- What's left this period, the daily allowance, and a projection for the period's end
- Today / This week card with a week picker; spending by category in a donut chart, with budgets
- Period summary compared with the previous period, a financial health score with its reasons, and short insights
- Needs / Wants / Savings split, measured against the 50/30/20 guide
- Desktop-only panels: spending by account, spending by weekday, and best / worst / average period

**Ledger (transactions)**
- Calendar view that marks days over the even daily share of income
- An All tab with search, type and category filters, grouped by day with subtotals
- Transaction detail sheet with Edit and Delete, and undo after a delete
- Bulk select on desktop: delete, recategorize, or export to CSV

**Pay periods**
- Open and close periods; Period History shows income, spending, money moved to savings, and what was left
- Savings count as *unspent*, not as spending
- Bills and one-off large expenses are left out of the daily pace, so a rent payment doesn't get treated as daily spending

**Accounts**
- Bank, e-wallet and cash accounts, with illustrated type icons
- How your balance splits across accounts, balance over periods, and runway (days covered at your current pace)
- Transfers between accounts; warnings for overdrawn or low accounts

**Categories**
- Duotone icons, separate icon and tile colors
- Kinds: bills, everyday, lifestyle, savings
- A spending target (budget) per category, and a detail sheet with this period's total and recent transactions

**Debts & receivables**
- "You owe" and "Owed to you" lists, most urgent first
- A payoff plan with an estimated debt-free date, plus a 30-day "Coming up" timeline
- Payment history; pay or collect from any account; WhatsApp / share reminders for receivables

**Wish list**
- Savings goals with contributions, progress, and an optional "want it by" date
- A roadmap that estimates when each wish is affordable, based on recent leftovers

**App**
- Installable PWA: works offline from a cached copy of your data, and asks before updating to a new version
- Light and dark theme, safe-area aware on iPhone

---

## Tech stack

| Area | Library |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS v4, Radix UI / shadcn components, lucide + Phosphor icons |
| Routing | React Router 7 (lazy-loaded feature pages) |
| Server state | TanStack Query, persisted to IndexedDB (`idb-keyval`) |
| Client state | Zustand (selected period) |
| Backend | Supabase (Postgres, Auth, Row Level Security, RPC functions) |
| Charts | Recharts |
| Build | Vite 6, `vite-plugin-pwa` (Workbox) |
| Quality | ESLint, Vitest, a headless-Chrome smoke test |

---

## Getting started

### Prerequisites

- Node.js 22 (the version CI uses)
- A Supabase project
- Chrome or Edge, only if you want to run the smoke test

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | Your Supabase anon (public) key |
| `VITE_APP_NAME` | no | App name |
| `VITE_BASE_URL` | no | Base path when the app isn't served at `/` (e.g. `/mouny/`). Leave empty for `/` |
| `VITE_USE_HASH_ROUTE` | no | `true` to use hash routing, for static hosts that don't rewrite routes (e.g. GitHub Pages) |

### 3. Set up the database

`supabase/migrations/` holds the complete schema, so a new, empty Supabase project can be set up from the repo alone. Run the files in filename order, either with `supabase db push` or by pasting each one into the Supabase SQL Editor:

| File | What it creates |
| --- | --- |
| `20260410000100_tables.sql` | All tables, with their constraints and indexes: `accounts`, `categories`, `category_budgets`, `pay_periods`, `wish_list`, `transactions`, `debts`, `debt_payments` |
| `20260410000200_triggers.sql` | Keeps `accounts.balance` in step with transactions, and keeps a category's `kind` and `is_savings` in sync |
| `20260410000300_row_level_security.sql` | RLS on every table: signed-in users only see and change their own rows |
| `20260410000400_functions.sql` | The RPCs the app calls: `transfer_balance`, `replace_transaction`, `period_summaries`, `pay_debt`, `collect_receivable`, `contribute_wish`, `buy_wish`, `contribute_wish_quantity` |
| `20261005000100_ledger_integrity.sql` | Transfer transaction types, composite foreign keys, consistency triggers for debts, wishes and transfers, closed-period locks, and `adjust_balance` |
| `20261005000200_archive_and_unperiodized_transfers.sql` | Account archiving, and transfers recorded outside any period. For databases that ran an early version of the file above |
| `20261005000300_savings_accounts.sql` | `accounts.is_savings`; `period_summaries` counts money moved into savings accounts as saved |

How the data is kept consistent:
- **Balances.** Every balance change is a transaction, so `balance = initial_balance + transactions`. That includes transfers (a `transfer_out` and a `transfer_in` sharing a `transfer_id`), receivable collections and balance adjustments. The app can't write `balance` directly.
- **What counts as income and spending.** `transfer_in` / `transfer_out` rows move money without being income or spending: transfers, money lent or borrowed, collections and adjustments. Stats only count `income` and `expense`. Debt payments are expenses.
- **Savings.** An expense in a savings category counts as saved. So does a transfer from an everyday account into an account with `is_savings`, net of transfers back out. In the app, `withSavingsMoves` (`src/lib/savings-moves.ts`) turns those transfers into savings rows for the stats; in the database, `period_summaries` does the same. Runway leaves savings accounts out.
- **Overdrafts.** New money out can't take an account below zero; the app shows that as "Insufficient balance". A correction, such as deleting income, can, and the app flags the account as overdrawn.
- **Linked records.** Deleting a debt payment puts it back on the debt. Deleting a wish purchase or instalment takes it off the wish. Deleting one side of a transfer deletes the other. The money on these rows can't be edited.
- **Periods.** There's one active period per user, and periods don't overlap. A transaction's date falls inside its period, and a closed period's money is locked.
- **Ownership.** Composite foreign keys mean a row can only point at the same user's rows. You can't delete an account, category or period that transactions still use. Deleting a user deletes all of their data.

These rules apply to signed-in users. The SQL editor and the service role can still correct anything.

> **Existing database:** the production database had the baseline schema before these files existed; it was built up by hand. Don't run the four `20260410…` files against it. Run only the migrations after them, starting with `20261005000100_ledger_integrity.sql`. That migration is written to work on both databases. If you start using the Supabase CLI there, mark the baseline as already applied first: `supabase migration repair --status applied 20260410000100 20260410000200 20260410000300 20260410000400`.

After a schema change, regenerate the types with `supabase gen types typescript --project-id <id> > src/types/database.types.ts`.

### 4. Create a user

There is no sign-up page. Create users in **Supabase → Authentication → Users**. A new user can add the default categories from the Categories page.

### 5. Run

```bash
npm run dev
```

The service worker is turned off in development, so you always see your latest edits.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the unit tests (Vitest) |
| `npm run smoke` | Serve `dist/` and check in headless Chrome that `/`, `/login` and `/transactions` render. Run `npm run build` first; set `CHROME_PATH` if Chrome isn't found |
| `npm run build:gh` | Build for GitHub Pages (`/mouny/` base path, hash routing) |

---

## Project structure

```
src/
  features/        One folder per page: dashboard, transactions, periods, accounts,
                   categories, debts, wish-list, menu, auth, static
  components/      Shared UI: layouts, drawers, shadcn primitives (components/ui)
  services/        Supabase data access, one service per domain; _base.ts handles
                   errors, auth and cache invalidation
  queries/         TanStack Query hooks and query keys
  stores/          Zustand stores (selected period)
  lib/             Pure logic, with tests next to it: period summary, spending pace,
                   health score, category kinds, CSV, query client, service worker
  hooks/           Shared React hooks (auth, online status, money glance, ...)
  routes/          Router and protected / public route guards
  contexts/        Theme and top-bar slot
  types/           Supabase-generated database types and app types
  assets/icons/    Custom SVG illustrations, loaded as the `app` icon collection
supabase/migrations/   SQL migrations (see "Set up the database")
scripts/               Demo-data seed SQL for the Supabase SQL Editor
ci/smoke-test.mjs      Headless-browser smoke test
```

The money math, such as period stats, spending pace and the health score, is in `src/lib` and has unit tests. Start there to change how a number is calculated.

---

## Deployment

**Vercel (main target).** `vercel.json` rewrites every route to `index.html`, so deep links and password-reset emails work. Hashed assets are cached for a year; `index.html` and `sw.js` are never cached, so users get new releases. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project.

**GitHub Pages.** The `Build & Deploy` workflow is triggered manually. It runs `npm run build:gh` and publishes `dist/` to the `gh-pages` branch.

**Supabase Auth.** Add the deployed URL, including `/reset-password`, to the project's redirect URLs.

---

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push to `production` and `master` and on every pull request. It runs lint, then the unit tests, then a production build, then the smoke test. The build uses placeholder Supabase keys, because the smoke test never signs in.

---

## Releasing

Versions follow [semver](https://semver.org/): a minor bump for new features, a patch bump for fixes only.

1. Bump `version` in `package.json`. It appears in the app's Menu, and a new version resets the offline cache.
2. Move the **Unreleased** notes in [CHANGELOG.md](CHANGELOG.md) under the new version and date, and list any migrations to run.
3. Schema changes go in a **new** migration file. Never edit one that has already run. Run new migrations in Supabase **before** deploying the app.
4. Commit as `chore: bump version to x.y.z`, then deploy.

Commit messages follow `type (scope): summary`, for example `feat (debts): ...` or `fix (data): ...`.

---

## License

[MIT](LICENSE)
