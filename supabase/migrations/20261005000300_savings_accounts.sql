-- Savings accounts.
--
-- Money moved into a savings account (a separate pocket like Bank Jago) is still yours,
-- so it stays in the balances, but it's set aside, not spendable: it counts as saved in
-- the period, the same as an expense in a savings category. Moving it back out to an
-- everyday account takes it off what the period saved. Moves between two savings
-- accounts don't count either way.

alter table public.accounts add column if not exists is_savings boolean not null default false;

grant update (name, type, archived_at, is_savings) on public.accounts to authenticated;

-- Income, expense and the savings part of expense, per period. Moves into savings
-- accounts (net of moves back out) count as both saved and gone from what's spendable,
-- just like an expense in a savings category.
create or replace function public.period_summaries(p_period_ids uuid[])
returns table (pay_period_id uuid, income numeric, expense numeric, savings numeric)
language sql
stable
set search_path = public
as $$
  with totals as (
    select t.pay_period_id,
           coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as income,
           coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expense,
           coalesce(sum(t.amount) filter (where t.type = 'expense' and c.is_savings), 0) as savings
      from public.transactions t
      left join public.categories c on c.id = t.category_id
     where t.pay_period_id = any (p_period_ids)
     group by t.pay_period_id
  ), moves as (
    -- The savings account's side of each transfer whose other side is an everyday account.
    select t.pay_period_id,
           sum(case when t.type = 'transfer_in' then t.amount else -t.amount end) as moved
      from public.transactions t
      join public.accounts a on a.id = t.account_id and a.is_savings
     where t.pay_period_id = any (p_period_ids)
       and t.transfer_id is not null
       and exists (
         select 1 from public.transactions o
           join public.accounts oa on oa.id = o.account_id
          where o.transfer_id = t.transfer_id and o.id <> t.id and not oa.is_savings)
     group by t.pay_period_id
  )
  select pay_period_id,
         coalesce(totals.income, 0),
         coalesce(totals.expense, 0) + coalesce(moves.moved, 0),
         coalesce(totals.savings, 0) + coalesce(moves.moved, 0)
    from totals
    full join moves using (pay_period_id)
$$;
