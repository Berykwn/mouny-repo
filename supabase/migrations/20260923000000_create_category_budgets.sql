-- Category Budgets: a standing spend target per category, reused every pay period.
-- Run this manually in the Supabase SQL editor (this repo has no linked Supabase CLI project yet).

create table public.category_budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount      numeric not null check (amount >= 0),
  created_at  timestamptz not null default now(),
  unique (user_id, category_id)
);

alter table public.category_budgets enable row level security;

create policy "category_budgets_select_own" on public.category_budgets
  for select using (auth.uid() = user_id);
create policy "category_budgets_insert_own" on public.category_budgets
  for insert with check (auth.uid() = user_id);
create policy "category_budgets_update_own" on public.category_budgets
  for update using (auth.uid() = user_id);
create policy "category_budgets_delete_own" on public.category_budgets
  for delete using (auth.uid() = user_id);
