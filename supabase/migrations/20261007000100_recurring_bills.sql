-- Recurring bills and subscriptions.
--
-- A bill is a promise to pay: rent on the 1st, Netflix on the 15th, a domain once a year.
-- Paying one is an ordinary expense that points back at the bill (recurring_bill_id), so
-- a bill is paid for a period exactly when the period has a transaction for it; deleting
-- that transaction makes it due again. The app reserves what's still due out of
-- "safe to spend". Safe to run twice.

create table if not exists public.recurring_bills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 80),
  -- What it usually costs; a utility bill that varies is paid with the real amount.
  amount      numeric not null check (amount > 0),
  kind        text not null default 'bill' check (kind in ('bill', 'subscription')),
  frequency   text not null default 'monthly' check (frequency in ('monthly', 'yearly')),
  -- Day of the month it's due; 31 means the month's last day in shorter months.
  due_day     smallint not null check (due_day between 1 and 31),
  -- Yearly bills only: the month it's due.
  due_month   smallint check (due_month between 1 and 12),
  category_id uuid,
  account_id  uuid,
  starts_on   date not null default current_date,
  -- Installments end; subscriptions usually don't.
  ends_on     date,
  paused      boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint recurring_bills_due_month_check check ((frequency = 'yearly') = (due_month is not null)),
  constraint recurring_bills_ends_on_check check (ends_on is null or ends_on >= starts_on),
  constraint recurring_bills_id_user_id_key unique (id, user_id),
  constraint recurring_bills_category_id_fkey
    foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  constraint recurring_bills_account_id_fkey
    foreign key (account_id, user_id) references public.accounts (id, user_id) on delete set null (account_id)
);

create index if not exists recurring_bills_user_id_idx on public.recurring_bills (user_id);

alter table public.recurring_bills enable row level security;

drop policy if exists recurring_bills_select_own on public.recurring_bills;
drop policy if exists recurring_bills_insert_own on public.recurring_bills;
drop policy if exists recurring_bills_update_own on public.recurring_bills;
drop policy if exists recurring_bills_delete_own on public.recurring_bills;
create policy recurring_bills_select_own on public.recurring_bills
  for select to authenticated using ((select auth.uid()) = user_id);
create policy recurring_bills_insert_own on public.recurring_bills
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy recurring_bills_update_own on public.recurring_bills
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy recurring_bills_delete_own on public.recurring_bills
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The payment's link to its bill. Deleting a bill keeps its payments as plain expenses.
alter table public.transactions add column if not exists recurring_bill_id uuid;

alter table public.transactions drop constraint if exists transactions_recurring_bill_id_fkey;
alter table public.transactions
  add constraint transactions_recurring_bill_id_fkey
    foreign key (recurring_bill_id, user_id) references public.recurring_bills (id, user_id)
    on delete set null (recurring_bill_id);

create index if not exists transactions_recurring_bill_id_idx
  on public.transactions (recurring_bill_id) where recurring_bill_id is not null;
