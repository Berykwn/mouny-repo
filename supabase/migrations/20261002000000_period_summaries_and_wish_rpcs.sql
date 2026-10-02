-- Period totals summed in the database, the last two wish writes made atomic, and
-- transfer_balance closed to signed-out callers.
--
-- Run this manually in the Supabase SQL editor, after 20261001000100_atomic_money_rpcs.sql.
-- The app works before it runs: it falls back to fetching and summing rows itself, and
-- to the old two-step wish writes.

-- Income, expense and savings per period. The client used to fetch every transaction
-- row and add them up, but the API returns at most 1000 rows per request, so history
-- covering more than that came out short without any error.
create or replace function public.period_summaries(p_period_ids uuid[])
returns table (pay_period_id uuid, income numeric, expense numeric, savings numeric)
language sql
stable
set search_path = public
as $$
  select t.pay_period_id,
         coalesce(sum(t.amount) filter (where t.type = 'income'), 0),
         coalesce(sum(t.amount) filter (where t.type = 'expense'), 0),
         coalesce(sum(t.amount) filter (where t.type = 'expense' and c.is_savings), 0)
    from public.transactions t
    left join public.categories c on c.id = t.category_id
   where t.pay_period_id = any(p_period_ids)
   group by t.pay_period_id
$$;

-- Buy a wish: the expense transaction (which moves the balance through its trigger)
-- and marking the wish bought, all or nothing.
create or replace function public.buy_wish(
  p_wish_id       uuid,
  p_amount        numeric,
  p_account_id    uuid,
  p_category_id   uuid,
  p_date          date,
  p_pay_period_id uuid,
  p_note          text
) returns public.wish_list
language plpgsql
set search_path = public
as $$
declare
  v_tx   public.transactions;
  v_item public.wish_list;
begin
  insert into public.transactions (user_id, pay_period_id, account_id, category_id, type, amount, note, date, wish_list_item_id)
  values (auth.uid(), p_pay_period_id, p_account_id, p_category_id, 'expense', p_amount, p_note, p_date, p_wish_id)
  returning * into v_tx;

  update public.wish_list
     set is_purchased = true, transaction_id = v_tx.id
   where id = p_wish_id
  returning * into v_item;

  if not found then
    raise exception 'Wish not found';
  end if;
  return v_item;
end;
$$;

-- Put an installment toward a quantity wish (e.g. grams of gold): the expense and the
-- wish's saved quantity and amount together. Locks the wish row so two installments at
-- once can't both pass the "only N left" check. Quantities are kept to 3 decimals, as
-- the client does, so 0.7 + 0.1 still reaches 0.8.
create or replace function public.contribute_wish_quantity(
  p_wish_id       uuid,
  p_quantity      numeric,
  p_amount        numeric,
  p_account_id    uuid,
  p_category_id   uuid,
  p_date          date,
  p_pay_period_id uuid,
  p_note          text
) returns public.wish_list
language plpgsql
set search_path = public
as $$
declare
  v_item     public.wish_list;
  v_tx       public.transactions;
  v_saved    numeric;
  v_complete boolean;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero.';
  end if;

  select * into v_item from public.wish_list where id = p_wish_id for update;
  if not found then
    raise exception 'Wish not found';
  end if;

  v_saved := round(coalesce(v_item.saved_quantity, 0) + round(p_quantity, 3), 3);
  if v_item.quantity is not null and v_saved > round(v_item.quantity, 3) then
    raise exception 'Only % % left to reach the target.',
      round(v_item.quantity - coalesce(v_item.saved_quantity, 0), 3), coalesce(v_item.unit, '');
  end if;
  v_complete := v_item.quantity is not null and v_saved >= round(v_item.quantity, 3);

  insert into public.transactions (user_id, pay_period_id, account_id, category_id, type, amount, note, date, wish_list_item_id)
  values (auth.uid(), p_pay_period_id, p_account_id, p_category_id, 'expense', p_amount, p_note, p_date, p_wish_id)
  returning * into v_tx;

  update public.wish_list
     set saved_quantity = v_saved,
         saved_amount   = coalesce(saved_amount, 0) + p_amount,
         is_purchased   = v_complete,
         -- Link the installment that completed the goal, as buying outright does.
         transaction_id = case when v_complete then v_tx.id else transaction_id end
   where id = p_wish_id
  returning * into v_item;

  return v_item;
end;
$$;

revoke execute on function public.period_summaries(uuid[]) from public, anon;
revoke execute on function public.buy_wish(uuid, numeric, uuid, uuid, date, uuid, text) from public, anon;
revoke execute on function public.contribute_wish_quantity(uuid, numeric, numeric, uuid, uuid, date, uuid, text) from public, anon;

grant execute on function public.period_summaries(uuid[]) to authenticated;
grant execute on function public.buy_wish(uuid, numeric, uuid, uuid, date, uuid, text) to authenticated;
grant execute on function public.contribute_wish_quantity(uuid, numeric, numeric, uuid, uuid, date, uuid, text) to authenticated;

-- transfer_balance (added outside these migrations) could be called without signing in.
-- Signed-in users only, whatever its exact parameter types are.
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'transfer_balance'
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Worth a look afterwards: if this returns true, transfer_balance runs with the owner's
-- rights and skips RLS, so it must check itself that both accounts belong to auth.uid().
--   select prosecdef from pg_proc where proname = 'transfer_balance';
