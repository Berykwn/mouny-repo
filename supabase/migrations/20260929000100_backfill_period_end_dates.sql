-- Closed periods without an end date: end them the day before the next period started
-- (or on their last transaction when no later period exists), so their stats stop counting days.
-- Run this manually in the Supabase SQL editor (this repo has no linked Supabase CLI project yet).

update public.pay_periods p
set end_date = coalesce(
  (
    select min(n.start_date) - 1
    from public.pay_periods n
    where n.user_id = p.user_id
      and n.start_date > p.start_date
  ),
  (
    select max(t.date)
    from public.transactions t
    where t.pay_period_id = p.id
  ),
  p.start_date
)
where p.status = 'closed'
  and p.end_date is null;
