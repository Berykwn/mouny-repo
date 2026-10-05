-- Mouny schema, part 4 of 4: functions the app calls through supabase.rpc().
--
-- Each multi-step money write runs as one database transaction: any error rolls the
-- whole thing back, so a dropped connection or a second device can't leave balances,
-- debts and wishes out of step. They run as the calling user (security invoker), so RLS
-- and the balance trigger apply exactly as they do to the app's own queries. Errors
-- raised here are written for the user; the app shows them as they are.

-- Move money between two of the user's accounts. Not a transaction row: a transfer
-- isn't income or spending.
create or replace function public.transfer_balance(
  p_from_id uuid,
  p_to_id   uuid,
  p_amount  numeric
) returns void
language plpgsql
set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;
  if p_from_id = p_to_id then
    raise exception 'Choose two different accounts.';
  end if;

  update public.accounts set balance = balance - p_amount where id = p_from_id;
  if not found then
    raise exception 'Account not found';
  end if;

  update public.accounts set balance = balance + p_amount where id = p_to_id;
  if not found then
    raise exception 'Account not found';
  end if;
end;
$$;

-- Change a transaction's amount, account, type or details by deleting and re-inserting
-- it (keeping id, created_at and wish link), so the balance moves through the trigger.
-- If the insert fails, e.g. it overdraws, the delete is undone too.
create or replace function public.replace_transaction(
  p_id            uuid,
  p_pay_period_id uuid,
  p_account_id    uuid,
  p_category_id   uuid,
  p_type          text,
  p_amount        numeric,
  p_note          text,
  p_date          date
) returns public.transactions
language plpgsql
set search_path = public
as $$
declare
  v_original public.transactions;
  v_new      public.transactions;
begin
  delete from public.transactions where id = p_id returning * into v_original;
  if not found then
    raise exception 'Transaction not found';
  end if;

  insert into public.transactions
    (id, user_id, created_at, wish_list_item_id, pay_period_id, account_id, category_id, type, amount, note, date)
  values
    (v_original.id, v_original.user_id, v_original.created_at, v_original.wish_list_item_id,
     p_pay_period_id, p_account_id, p_category_id, p_type, p_amount, p_note, p_date)
  returning * into v_new;

  return v_new;
end;
$$;

-- Income, expense and the savings part of expense, per period. Summed here because the
-- API returns at most 1000 rows per request, so adding up rows on the client comes out
-- short for long histories.
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
   where t.pay_period_id = any (p_period_ids)
   group by t.pay_period_id
$$;

-- Lower a debt's remaining amount and log the payment. Locks the debt row so two
-- payments at once can't both read the same remaining amount. A building block for
-- pay_debt and collect_receivable; the app doesn't call it directly.
create or replace function public.apply_debt_payment(
  p_debt_id        uuid,
  p_amount         numeric,
  p_date           date,
  p_account_id     uuid,
  p_transaction_id uuid
) returns public.debts
language plpgsql
set search_path = public
as $$
declare
  v_debt public.debts;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select * into v_debt from public.debts where id = p_debt_id for update;
  if not found then
    raise exception 'Debt not found';
  end if;

  update public.debts
     set remaining_amount = greatest(0, remaining_amount - p_amount),
         status = case when remaining_amount - p_amount <= 0 then 'paid' else 'active' end
   where id = p_debt_id
  returning * into v_debt;

  insert into public.debt_payments (user_id, debt_id, amount, date, account_id, transaction_id)
  values (v_debt.user_id, p_debt_id, p_amount, p_date, p_account_id, p_transaction_id);

  return v_debt;
end;
$$;

-- Pay a debt from an account: the expense, the debt update and the history row.
create or replace function public.pay_debt(
  p_debt_id       uuid,
  p_amount        numeric,
  p_account_id    uuid,
  p_date          date,
  p_pay_period_id uuid,
  p_category_id   uuid,
  p_note          text
) returns public.debts
language plpgsql
set search_path = public
as $$
declare
  v_tx public.transactions;
begin
  insert into public.transactions (user_id, pay_period_id, account_id, category_id, type, amount, note, date)
  values (auth.uid(), p_pay_period_id, p_account_id, p_category_id, 'expense', p_amount, p_note, p_date)
  returning * into v_tx;

  return public.apply_debt_payment(p_debt_id, p_amount, p_date, p_account_id, v_tx.id);
end;
$$;

-- Collect on a receivable into an account. Collections don't create a transaction (the
-- money lent out was already recorded as an expense), so the balance moves directly.
create or replace function public.collect_receivable(
  p_debt_id    uuid,
  p_amount     numeric,
  p_account_id uuid,
  p_date       date
) returns public.debts
language plpgsql
set search_path = public
as $$
begin
  update public.accounts set balance = balance + p_amount where id = p_account_id;
  if not found then
    raise exception 'Account not found';
  end if;

  return public.apply_debt_payment(p_debt_id, p_amount, p_date, p_account_id, null);
end;
$$;

-- Add to a wish's savings in one statement, so concurrent contributions both count.
create or replace function public.contribute_wish(
  p_id     uuid,
  p_amount numeric
) returns public.wish_list
language plpgsql
set search_path = public
as $$
declare
  v_item public.wish_list;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  update public.wish_list
     set saved_amount = greatest(0, coalesce(saved_amount, 0) + p_amount)
   where id = p_id
  returning * into v_item;

  if not found then
    raise exception 'Wish not found';
  end if;
  return v_item;
end;
$$;

-- Buy a wish: the expense and marking the wish bought.
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

-- Signed-in users only. Supabase grants new functions to anon by default, so revoke
-- that explicitly. apply_debt_payment is granted too because pay_debt and
-- collect_receivable call it as the user.
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'transfer_balance', 'replace_transaction', 'period_summaries', 'apply_debt_payment',
         'pay_debt', 'collect_receivable', 'contribute_wish', 'buy_wish', 'contribute_wish_quantity'
       )
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
