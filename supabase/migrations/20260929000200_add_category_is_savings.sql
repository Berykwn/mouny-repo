-- Savings categories: money set aside, not spent. Still an expense for cash flow (it leaves the account),
-- but excluded from spending pace, projections and the health score.
-- Run this manually in the Supabase SQL editor (this repo has no linked Supabase CLI project yet).

alter table public.categories add column is_savings boolean not null default false;

update public.categories
set is_savings = true
where type = 'expense'
  and lower(name) = 'savings';
