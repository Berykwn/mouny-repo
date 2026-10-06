# Changelog

All notable changes to Mouny, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/):

- **Minor** (1.**x**.0): new features or changes you'll notice
- **Patch** (1.x.**y**): fixes only

> **About the version numbers.** Until October 2026 the version was bumped by hand and lagged behind the work: everything from April to September 2026 went out as "1.0", and several feature releases went out as patches (1.2.1–1.2.7). The history below is renumbered from the commit log so each release gets the version it should have had. The old label is shown in brackets where there was one, e.g. *(was 1.2.7)*.

---

## [Unreleased]

The app now works offline, the sign-in pages match the rest of the app, categories have kinds, and balances, debts and wishes can no longer drift out of step.

> **Migrations required, in order:** `20261005000100_ledger_integrity.sql`, `20261005000200_archive_and_unperiodized_transfers.sql`, `20261005000300_savings_accounts.sql`, `20261005000400_move_to_savings.sql`, `20261006000100_calculation_fixes.sql`. Run them before deploying this version: transfers, collections, balance adjustments, archiving and savings accounts depend on them. They keep every current balance as it is.

### Added
- **Every balance change is in the ledger.** Transfers between accounts, collected receivables and balance adjustments now show up as transactions. An account's balance always equals its opening balance plus its transactions. Transfers and adjustments still work between pay periods; they're then recorded outside any period.
- **Savings accounts.** Mark an account (like a separate savings pocket) as a savings account:
  - Moving money into it counts as saved for the period, and the money stays in your total balance. Before, a savings expense made the money disappear, and a transfer didn't count as saving.
  - Moving money back out to an everyday account takes it off what the period saved. Moves between two savings accounts don't count.
  - Runway and what's left to spend leave savings accounts out.
  - When you pick a savings category while a savings account exists, the form offers to record a transfer instead.
  - **Move to savings account.** A savings expense recorded earlier (the money went nowhere) can be moved into a savings account from its detail sheet. It becomes a transfer with the same date and note: the source balance doesn't change, the savings account gains the money, and the period's numbers stay the same.
- **Archive accounts.** An account with transactions can't be deleted, so the app now offers to archive it once its balance is zero. An archived account is hidden from your accounts and pickers, its history stays (locked), and you can restore it from the Accounts page.
- **Works offline.** Your last balances and transactions are saved on the device, so the app opens with them even without a connection. A banner shows when you're offline. Changes are blocked while offline, with a clear message, so nothing gets lost.
- **Update prompt.** When a new version is ready, a toast offers **Reload** instead of switching versions while you're filling in a form. An open app checks for updates every hour and whenever you return to it.
- **Category kinds.** Each expense category is now *bills*, *everyday*, *lifestyle* or *savings*. The category list is grouped by kind.
- **Needs / Wants / Savings card** in analytics, measured against the 50/30/20 guide.
- **Category detail sheet.** Tap a category to see this period's total, budget progress and recent transactions, with Edit and Delete.
- Proper install icons for Android (maskable) and iOS (apple-touch-icon).

### Changed
- **Debt money no longer skews your stats.** Lending money used to count as spending, and borrowing as income. Both now count as transfers, and so do collections and transfers between your own accounts. They move your balance but stay out of income, spending, savings rate and the health score. Debt payments still count as bills. Existing lending and borrowing transactions are converted automatically.
- **Linked transactions stay in step:**
  - Deleting a debt payment puts the amount back on the debt.
  - Deleting a wish purchase or instalment takes it off the wish.
  - Deleting one side of a transfer deletes both sides.
  - You can't edit the amount, account or type of these transactions, and there's no undo when you delete one.
- **Corrections can take an account below zero.** For example, deleting income you've already spent. The account is then flagged as overdrawn. New spending and transfers still can't overdraw.
- **Closed periods are locked.** Their money can't change, though you can still fix a note or category. A transaction's date has to fall inside its period, and periods can't overlap.
- The daily pace and projections now use the category's kind to decide what counts as a bill. Before, the app guessed from the category name.
- The sign-in, forgot-password and reset-password pages now use the app's own layout and styling.
- Toasts are now a compact pill at the top centre, matching the offline banner.
- Error messages are in plain language instead of raw database text. A failed load shows one toast instead of one per page. That toast stays silent while you're offline and goes away once data loads again.
- The status bar colour follows the app's theme instead of staying black.

### Fixed
- **Quantities with a comma.** Typing `0,5` gram in a quantity wish recorded 5 grams (and ten times the cost). A comma is now read as the decimal separator.
- **Recording a debt is all or nothing.** When lending more than an account held, the receivable was saved without the money leaving; trying again made a second one. The debt and its transfer are now saved together.
- **Editing a debt's total can't lose a payment.** A payment made at the same moment (on another device) could be wiped from the remaining amount. The database now works the remaining amount out itself.
- **Savings accounts count once.** Salary paid straight into a savings account and then moved out counted twice in net and *Safe to spend*. Income into a savings account now counts as saved, and spending from one comes off what's saved.
- **Closed periods stay as they closed.** Marking an account or category as savings rewrote the numbers of periods already closed. Each transaction now keeps the savings flags it had, and closed periods keep theirs.
- **Repaying a cash loan isn't spending twice.** Borrowed cash comes in as a transfer and spending it is counted, so the repayment is now a transfer too. Pay-later and installment payments are still expenses.
- **Closing a period.** It can't close before its last transaction, the closing balance is taken from the accounts in the database, and a closed period can't be reopened.
- *Safe to spend* in the add-transaction form now matches the dashboard (money moved into savings isn't spendable).
- Editing an amount with decimals (older data) no longer reads it ten times too high.
- Categories with a zero budget no longer scramble the budget order in analytics.
- Short amounts show negatives properly (`-1.5jt`, not `-1500000`).
- **Balance adjustment.** A minus typed before the number, or the minus sign some phone keyboards type, was dropped. Any minus in the field now makes it negative, and a **+/−** button flips the sign for keypads with no minus key.
- The app no longer signs you out when you open it offline with an expired session. It refreshes the session once you're back online.
- The bottom nav and drawers now clear the iPhone home indicator.
- The app font (Barlow) now loads offline too.
- Signing out also clears your data from the device's offline copy.

### Internal
- **Complete database schema in `supabase/migrations/`.** It replaces the earlier patch migrations, which assumed tables that had been created by hand. A fresh Supabase project can now be set up from the repo alone. It covers tables, constraints, indexes, the balance and category-kind triggers, row level security, and every RPC. The schema also adds:
  - one active pay period per user
  - `transfer_balance` checks for amount and accounts
  - edits to a transaction's amount, account or type move the balance through the trigger
- Removed the unused `active_period_summary` view from the generated types.
- The ledger migration also:
  - adds the `transfer_in` and `transfer_out` transaction types, with `transfer_id` / `debt_id` links
  - adds composite foreign keys, so a row can only point at the same user's rows
  - lets balances change only through transactions (the app can no longer write `accounts.balance`)
  - adds an `adjust_balance` RPC
  - finds and drops the old hand-made balance trigger, whatever it was named, so nothing is counted twice
- Removed the client-side fallbacks for paying and collecting debts and for editing transactions. The RPCs they stood in for are always part of the schema now.

---

## [1.14.2] — 2026-10-02 *(was 1.2.7)*

Fixes for deep links, long histories and money writes, plus CI.

### Fixed
- **Opening a page by URL on Vercel.** Refreshing on a page like `/transactions`, or opening the password-reset link from email, used to return a 404 for anyone without the installed app.
- **Totals for long histories.** Supabase returns at most 1000 rows per request, so periods with more rows came out short, with no error. Period totals are now added up in the database.
- **Wish purchases are atomic.** Buying a wish or paying an instalment records the expense and the wish's progress together, and blocks the same instalment from being recorded twice.
- A page that crashes or fails to load now shows an error screen with a reload option instead of a blank page.
- Transfers can no longer be made without signing in.

### Internal
- CI runs lint, unit tests, a production build and a headless-browser smoke test on every push and pull request.
- Cleared the remaining lint and build warnings.

---

## [1.14.1] — 2026-10-01 *(was 1.2.6)*

### Fixed
- **Blank page in production.** Two library bundles depended on each other, so React sometimes never started. All libraries except the charts now ship in one bundle.

---

## [1.14.0] — 2026-10-01 *(was 1.2.5)*

Pages load faster and share data, and money writes are safer.

### Changed
- **Instant page switches.** All pages read from one shared cache, so moving between pages shows data straight away. Shared data is fetched only once.
- **The selected period carries over** between Overview and Ledger, and survives a reload.
- **Smaller first load:** about 426 KB to about 250 KB gzipped. Pages load on demand.
- Switching periods or saving no longer flashes a loading screen.

### Fixed
- **Atomic money writes.** Editing a transaction, paying a debt, collecting a receivable and contributing to a wish each happen as one database transaction. A dropped connection can no longer leave balances out of step.

### Internal
- Added Vitest, with tests for period stats, spending pace, the health score, dates, debt and wish plans, and the period store.

---

## [1.13.0] — 2026-10-01 *(was 1.2.4)*

### Added
- **Desktop sidebar overview:** the period's day number, what's left, and how much income is used. Badges show overdue debts and wishes you can afford.
- **Redesigned Menu:** a profile card, the current period with Close / Open period, and a live summary line on each row.
- The day sheet on the dashboard shows category icons instead of coloured dots.

---

## [1.12.0] — 2026-10-01 *(was 1.2.3)*

Big updates to Debts and the Ledger.

### Added
- **Debt payoff plan.** An estimated debt-free date, and how much to set aside this period to meet due dates.
- **"Coming up"** timeline of debts and receivables due in the next 30 days.
- **Debt payment history**, editable debt details, and a WhatsApp / share reminder for receivables.
- Quick amount chips in the pay and collect forms.
- **Ledger summary card:** what's left, a spent / saved / left bar, and the daily allowance.
- **Transaction detail and edit.** Tap a transaction to edit or delete it. Deletes can be undone.
- **Search and filters** in the All tab, grouped by day with subtotals.
- The calendar marks days that went over the even daily share of income.

### Fixed
- Rent, instalments and other large one-off expenses no longer distort the daily pace. Before, paying rent early in a period could project as about −Rp 23 jt.

---

## [1.11.0] — 2026-09-30 *(was 1.2.2)*

### Added
- **Accounts overview:** how your balance splits across accounts, how many days it covers at your current pace, and a balance-over-periods chart.
- **Account detail sheet** with money in and out, recent transactions and Transfer.
- Overdrawn and low accounts are flagged.

---

## [1.10.0] — 2026-09-30 *(was 1.2.1)*

A wish-list redesign and a round of correctness fixes.

### Added
- **Wish list roadmap.** Estimates when each wish becomes affordable, based on what was left over in the last three periods.
- **"Want it by" date** for wishes: shows whether you're on track and how much to set aside per period.
- Optional icons for wishes, and a "Came true" list of purchased ones.
- A shared summary card design across Wish list, Debts, Accounts, Categories and Period History.

### Fixed
- The health score no longer counts receivables as debt.
- Savings are no longer counted as "Spent". Uncategorized expenses get their own group, so breakdowns add up to 100%.
- Day counts include both the first and last day, and dates no longer shift by a day in WIB.
- Stale data after quick period switches, and missing refreshes after adding a transaction.
- CSV export: opens correctly in Excel and is protected against formula injection.
- Hash routing / base path, and reloading the reset-password page.

---

## [1.9.0] — 2026-09-30 *(was 1.2)*

A desktop layout, analytics in Overview, and savings treated as unspent money.

### Added
- **Desktop layout:** a breadcrumb top bar with Add Transaction, and a list-plus-side-card layout on every page.
- Desktop analytics: spending by account, by weekday, and a period comparison.
- **Savings categories.** Mark a category as savings; money moved there counts as *unspent*, not spent.
- Period History shows **Unspent / Overspent**, with income, spending, money moved to savings, and what was left.
- Analytics moved into Overview, with a category donut chart, a week picker, and a short list of insights.
- Duotone category icons with separate icon and background colours, and illustrated account type icons.

### Fixed
- Debts can be paid or collected from any account, not only the one they were created with. The app checks the account has enough balance.
- Period day counts, dates and projections. Closed periods stop counting days at their end date.
- Projections show only after 3 days of data and explain what they assume.

---

## [1.8.0] — 2026-09-23 *(was 1.1)*

Budgets and trends.

### Added
- **Category spending targets** (budgets), edited from the Categories page.
- **Multi-period spending trend** chart.
- An All tab in the mobile ledger.
- A simpler Add Transaction drawer, and gestures on calendar day cards.

### Changed
- The Today screen is simpler, and ledger analytics are easier to find.

---

## [1.7.0] — 2026-08-31

### Added
- **Wish list contributions:** save towards a wish over time, with a progress bar.
- **Bulk select on desktop:** delete, recategorize or export several transactions at once.

### Fixed
- Desktop: page titles, sidebar branding, and scrolling inside modals.

---

## [1.6.0] — 2026-07-30

A redesign of the dashboard, transactions and navigation.

### Added
- Spending projections in period analytics.
- Empty states on every list page.

### Changed
- **New design** for the dashboard, transactions and navigation.
- Accounts moved into the bottom navigation.
- Amount inputs, date formats and the account picker work the same way in every form.

### Removed
- The Settings page.

### Fixed
- Load errors are shown instead of failing silently.

---

## [1.5.0] — 2026-06-09

### Added
- Icons and extra details in the account and category pickers.
- Debt types, with balance and type shown on each debt.
- Period summary detail, with an adjustment category for balance corrections.

### Changed
- Clearer amounts and account / category selection in the transaction, debt and wish forms.
- The Not Found page is now in English, and buttons were resized.

---

## [1.4.0] — 2026-05-31

Accounts, categories and period history get their own pages.

### Added
- **Accounts**, with transfers between them.
- **Categories** management.
- **Period history.**
- Overview shows what's left, the total balance, and a comparison with the previous period.

### Changed
- New dashboard layout, main layout and sheet menus, and a new primary colour.

---

## [1.3.0] — 2026-05-15

A new look, and debts connected to transactions.

### Added
- Receivables and debt payments create transactions, using a dedicated "Debt Payment" category.
- Swipe between tabs on the dashboard and transactions.
- An icon picker for categories.
- A font style option.

### Changed
- New design language and the Barlow font.
- Periods, accounts and categories moved into the dashboard.
- Recording a balance transaction when creating a debt is now optional.

---

## [1.2.0] — 2026-04-17

### Added
- A new dashboard layout.
- Skeleton loading screens.
- A logout confirmation.

### Changed
- Date picking uses a proper date picker.

### Fixed
- Sign-in errors are shown as toasts.
- The menu background in dark mode.

---

## [1.1.0] — 2026-04-14

### Added
- **Debts** and **transactions**.
- Installable PWA with a service worker.

---

## [1.0.0] — 2026-04-12

The first version of Mouny.

- Pay periods, with an active-period card
- Wish list
- A dashboard
- Settings
- Email sign-in

[Unreleased]: ../../compare/f0a11ff...HEAD
[1.14.2]: ../../commit/f0a11ff
[1.14.1]: ../../commit/e6c1859
[1.14.0]: ../../commit/cc9da46
[1.13.0]: ../../commit/98b00f3
[1.12.0]: ../../commit/414911b
[1.11.0]: ../../commit/3d8ea4f
[1.10.0]: ../../commit/a6c171c
[1.9.0]: ../../commit/9ce940c
[1.8.0]: ../../commit/4b38e12
[1.7.0]: ../../commit/4161f14
[1.6.0]: ../../commit/d9cc482
[1.5.0]: ../../commit/d391e14
[1.4.0]: ../../commit/9e45af5
[1.3.0]: ../../commit/1ce2f6f
[1.2.0]: ../../commit/d473871
[1.1.0]: ../../commit/d2376f4
[1.0.0]: ../../commit/3044ecc
