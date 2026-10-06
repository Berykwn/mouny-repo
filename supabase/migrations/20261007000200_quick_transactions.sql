-- Quick transactions: amounts set up per category ("Parkir 2rb", "Parkir 5rb") that record
-- in one tap. Only the account and an optional note are asked for; the date is today.
-- The account picked last time is remembered per quick transaction. Safe to run twice.

create table if not exists public.quick_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id     uuid not null,
  amount          numeric not null check (amount > 0),
  -- Shown instead of the category name, e.g. "Kopi" under Food & Drinks.
  label           text check (label is null or length(btrim(label)) between 1 and 40),
  last_account_id uuid,
  created_at      timestamptz not null default now(),
  constraint quick_transactions_id_user_id_key unique (id, user_id),
  constraint quick_transactions_category_id_fkey
    foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade,
  constraint quick_transactions_last_account_id_fkey
    foreign key (last_account_id, user_id) references public.accounts (id, user_id) on delete set null (last_account_id)
);

create index if not exists quick_transactions_user_id_idx on public.quick_transactions (user_id);
create index if not exists quick_transactions_category_id_idx on public.quick_transactions (category_id);

alter table public.quick_transactions enable row level security;

drop policy if exists quick_transactions_select_own on public.quick_transactions;
drop policy if exists quick_transactions_insert_own on public.quick_transactions;
drop policy if exists quick_transactions_update_own on public.quick_transactions;
drop policy if exists quick_transactions_delete_own on public.quick_transactions;
create policy quick_transactions_select_own on public.quick_transactions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy quick_transactions_insert_own on public.quick_transactions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy quick_transactions_update_own on public.quick_transactions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy quick_transactions_delete_own on public.quick_transactions
  for delete to authenticated using ((select auth.uid()) = user_id);
