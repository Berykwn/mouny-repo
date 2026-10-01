-- Debt payments: one row per payment made on a debt or collection received on a receivable,
-- so a debt's detail sheet can show its history. Collections don't create a transaction,
-- so transactions alone can't tell this story.
-- Run this manually in the Supabase SQL editor (this repo has no linked Supabase CLI project yet).
-- The app works before it runs: logging a payment is best-effort and the history just stays empty.

create table if not exists public.debt_payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  debt_id        uuid not null references public.debts(id) on delete cascade,
  amount         numeric not null check (amount > 0),
  date           date not null,
  account_id     uuid references public.accounts(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists debt_payments_debt_id_idx on public.debt_payments (debt_id, date desc);

alter table public.debt_payments enable row level security;

create policy "debt_payments_select_own" on public.debt_payments
  for select using (auth.uid() = user_id);
create policy "debt_payments_insert_own" on public.debt_payments
  for insert with check (auth.uid() = user_id);
create policy "debt_payments_update_own" on public.debt_payments
  for update using (auth.uid() = user_id);
create policy "debt_payments_delete_own" on public.debt_payments
  for delete using (auth.uid() = user_id);
