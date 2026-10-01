-- Atomic money operations. Each of these used to be several requests from the client
-- (delete then insert, read then write, transaction then debt update), so a dropped
-- connection or a second device could leave balances and debts out of step. Each
-- function runs as one database transaction: any error rolls the whole thing back.
--
-- They run as the calling user (security invoker), so RLS and the existing balance
-- triggers on transactions apply exactly as they do for the client's own queries.
--
-- Run this manually in the Supabase SQL editor, after 20261001000000_create_debt_payments.sql.
-- The app works before it runs: it falls back to the old multi-request path when a
-- function is missing.

-- Change a transaction's amount, account, type or details. Balances follow transactions
-- through the insert/delete triggers, so this deletes and re-inserts (keeping id,
-- created_at and wish link); if the insert fails, e.g. it overdraws, the delete is undone.
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

-- Lower a debt's remaining amount and log the payment in its history. Locks the debt
-- row so two payments at once can't both read the same remaining amount.
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

-- Pay a debt from an account: the expense transaction (which moves the balance through
-- its trigger), the debt update and the history row, all or nothing.
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

-- Collect on a receivable into an account. Collections don't create a transaction, so
-- the account balance moves directly, together with the debt and its history.
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

-- Signed-in users only. apply_debt_payment is a building block the app doesn't call, but
-- pay_debt and collect_receivable run as the user, so the user needs it too.
revoke execute on function public.apply_debt_payment(uuid, numeric, date, uuid, uuid) from public, anon;
revoke execute on function public.replace_transaction(uuid, uuid, uuid, uuid, text, numeric, text, date) from public, anon;
revoke execute on function public.pay_debt(uuid, numeric, uuid, date, uuid, uuid, text) from public, anon;
revoke execute on function public.collect_receivable(uuid, numeric, uuid, date) from public, anon;
revoke execute on function public.contribute_wish(uuid, numeric) from public, anon;

grant execute on function public.apply_debt_payment(uuid, numeric, date, uuid, uuid) to authenticated;
grant execute on function public.replace_transaction(uuid, uuid, uuid, uuid, text, numeric, text, date) to authenticated;
grant execute on function public.pay_debt(uuid, numeric, uuid, date, uuid, uuid, text) to authenticated;
grant execute on function public.collect_receivable(uuid, numeric, uuid, date) to authenticated;
grant execute on function public.contribute_wish(uuid, numeric) to authenticated;
