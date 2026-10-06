-- Calculation fixes.
--
-- 1. Savings flags are fixed per transaction. Whether an account or category counts as
--    savings is copied onto each transaction, and a closed period keeps the copy it closed
--    with: marking an account as savings today no longer rewrites last month's numbers.
--    Open periods follow the current flags.
-- 2. A savings account's own income and spending count against what's set aside. Salary
--    paid straight into a savings account is saved (not spendable), and spending from one
--    takes it off what's saved, so moving the money out later can't count it twice.
-- 3. Recording a debt and the money it moved happen together (create_debt): a failed
--    transfer no longer leaves a debt behind.
-- 4. A debt's remaining amount is worked out in the database. Editing the total keeps
--    what's been paid, measured on the locked row, so a payment made at the same time
--    can't be lost; the app can't set the remaining amount or log a payment without its
--    transaction.
-- 5. Repaying a cash loan is a transfer, not spending. The loan came in as a transfer and
--    spending it was already counted, so counting the repayment too doubled it.
-- 6. Closing a period: the end date can't be before its last transaction, the closing
--    balance is taken from the accounts here, and a closed period can't be reopened.
--
-- Like the other rules, these apply to signed-in users only; the SQL editor and service
-- role (no auth.uid()) can still correct anything.


-- ---------------------------------------------------------------------------------
-- 1. Savings flags on each transaction
-- ---------------------------------------------------------------------------------
alter table public.transactions
  add column if not exists account_is_savings  boolean not null default false,
  add column if not exists category_is_savings boolean not null default false;

-- Existing rows take the current flags: the best record there is of what they were.
update public.transactions t
   set account_is_savings  = coalesce((select a.is_savings from public.accounts a where a.id = t.account_id), false),
       category_is_savings = coalesce((select c.is_savings from public.categories c where c.id = t.category_id), false);

create or replace function public.transactions_savings_flags()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_closed   boolean := false;
  v_category boolean;
begin
  v_category := coalesce((select is_savings from public.categories where id = new.category_id), false);

  if tg_op = 'UPDATE' then
    select status = 'closed' into v_closed from public.pay_periods where id = old.pay_period_id;
  end if;

  -- A closed period's numbers are fixed: its rows keep the flags it closed with.
  if coalesce(v_closed, false) then
    if auth.uid() is not null and v_category <> old.category_is_savings then
      raise exception 'This period is closed, so a transaction can''t move in or out of savings.';
    end if;
    new.account_is_savings := old.account_is_savings;
    new.category_is_savings := old.category_is_savings;
    return new;
  end if;

  new.account_is_savings := coalesce((select is_savings from public.accounts where id = new.account_id), false);
  new.category_is_savings := v_category;
  return new;
end;
$$;

drop trigger if exists transactions_savings_flags on public.transactions;
create trigger transactions_savings_flags
  before insert or update on public.transactions
  for each row execute function public.transactions_savings_flags();

-- Flipping a flag carries over to the transactions of open periods (and transfers between
-- periods); the trigger above reads the new flag.
create or replace function public.savings_flag_changed()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'accounts' then
    update public.transactions t
       set account_is_savings = new.is_savings
     where t.account_id = new.id
       and not exists (select 1 from public.pay_periods p where p.id = t.pay_period_id and p.status = 'closed');
  else
    update public.transactions t
       set category_is_savings = new.is_savings
     where t.category_id = new.id
       and not exists (select 1 from public.pay_periods p where p.id = t.pay_period_id and p.status = 'closed');
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_savings_flag_changed on public.accounts;
create trigger accounts_savings_flag_changed
  after update on public.accounts
  for each row when (old.is_savings is distinct from new.is_savings)
  execute function public.savings_flag_changed();

drop trigger if exists categories_savings_flag_changed on public.categories;
create trigger categories_savings_flag_changed
  after update on public.categories
  for each row when (old.is_savings is distinct from new.is_savings)
  execute function public.savings_flag_changed();


-- ---------------------------------------------------------------------------------
-- 2. Period totals, from the flags on each transaction
-- ---------------------------------------------------------------------------------

-- Income, expense and the savings part of expense, per period. Set aside counts:
-- expenses in savings categories, moves from everyday accounts into savings accounts
-- (net of moves back out), and a savings account's own income (saved) and spending
-- (taken back out of what's saved).
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
           coalesce(sum(t.amount) filter (where t.type = 'expense' and t.category_is_savings), 0) as savings,
           coalesce(sum(case t.type when 'income' then t.amount when 'expense' then -t.amount end)
                      filter (where t.account_is_savings), 0) as direct
      from public.transactions t
     where t.pay_period_id = any (p_period_ids)
     group by t.pay_period_id
  ), moves as (
    -- The savings account's side of each transfer whose other side is an everyday account.
    select t.pay_period_id,
           sum(case when t.type = 'transfer_in' then t.amount else -t.amount end) as moved
      from public.transactions t
     where t.pay_period_id = any (p_period_ids)
       and t.account_is_savings
       and t.transfer_id is not null
       and exists (
         select 1 from public.transactions o
          where o.transfer_id = t.transfer_id and o.id <> t.id and not o.account_is_savings)
     group by t.pay_period_id
  )
  select pay_period_id,
         coalesce(totals.income, 0),
         coalesce(totals.expense, 0) + coalesce(totals.direct, 0) + coalesce(moves.moved, 0),
         coalesce(totals.savings, 0) + coalesce(totals.direct, 0) + coalesce(moves.moved, 0)
    from totals
    full join moves using (pay_period_id)
$$;


-- ---------------------------------------------------------------------------------
-- 3. Recording a debt
-- ---------------------------------------------------------------------------------

-- The debt and, when money actually changed hands, its transfer: borrowed money in,
-- lent money out. Neither is income or spending.
create or replace function public.create_debt(
  p_type          text,
  p_counterparty  text,
  p_total_amount  numeric,
  p_due_date      date,
  p_notes         text,
  p_account_id    uuid,
  p_moves_money   boolean,
  p_date          date,
  p_pay_period_id uuid
) returns public.debts
language plpgsql
set search_path = public
as $$
declare
  v_debt public.debts;
begin
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;
  if p_moves_money and p_account_id is null then
    raise exception 'Please select an account.';
  end if;

  insert into public.debts (user_id, type, counterparty, total_amount, remaining_amount, due_date, pay_from_account_id, notes)
  values (auth.uid(), p_type, trim(p_counterparty), p_total_amount, p_total_amount, p_due_date, p_account_id, nullif(p_notes, ''))
  returning * into v_debt;

  if p_moves_money then
    insert into public.transactions (user_id, pay_period_id, account_id, type, amount, note, date, debt_id)
    values (auth.uid(), p_pay_period_id, p_account_id,
            case when p_type = 'debt' then 'transfer_in' else 'transfer_out' end,
            p_total_amount,
            case when p_type = 'debt' then 'Debt received — ' else 'Lent to — ' end || trim(p_counterparty),
            p_date, v_debt.id);
  end if;

  return v_debt;
end;
$$;


-- ---------------------------------------------------------------------------------
-- 4. A debt's remaining amount
-- ---------------------------------------------------------------------------------

-- A new debt starts with all of it remaining. An edit keeps what's been paid (total minus
-- remaining, read from the locked row), so the remaining amount moves with the total and
-- never below zero. Payments change it through debt_payments_apply, a trigger one level
-- down, which this leaves alone.
create or replace function public.debts_amounts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or pg_trigger_depth() > 1 then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.remaining_amount := new.total_amount;
  else
    new.remaining_amount := greatest(0, new.total_amount - (old.total_amount - old.remaining_amount));
  end if;
  return new;
end;
$$;

drop trigger if exists debts_amounts on public.debts;
create trigger debts_amounts
  before insert or update on public.debts
  for each row execute function public.debts_amounts();

-- Status follows the remaining amount however it changed (debts_amounts sets it without
-- naming it in the update, which a column trigger wouldn't see). Runs after debts_amounts.
drop trigger if exists debts_sync_status on public.debts;
create trigger debts_sync_status
  before insert or update on public.debts
  for each row execute function public.debts_sync_status();

-- A payment is the history of a transaction: it can't be logged without one, and it's
-- never edited (deleting its transaction deletes it, and puts the amount back).
create or replace function public.debt_payments_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if not exists (
    select 1 from public.transactions t
     where t.id = new.transaction_id and t.debt_id = new.debt_id and t.amount = new.amount
  ) then
    raise exception 'A debt payment needs its transaction.';
  end if;
  return new;
end;
$$;

drop trigger if exists debt_payments_guard on public.debt_payments;
create trigger debt_payments_guard
  before insert on public.debt_payments
  for each row execute function public.debt_payments_guard();

revoke update on public.debt_payments from anon, authenticated;


-- ---------------------------------------------------------------------------------
-- 5. Paying a debt
-- ---------------------------------------------------------------------------------

-- Pay a debt from an account, with the payment. Usually an expense: for installments and
-- pay-later the payment is what the purchase costs. A cash loan (one that brought money
-- in) is different: spending that money was already counted, so paying it back is a
-- transfer out.
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
  v_tx      public.transactions;
  v_cash_in boolean;
begin
  select exists (
    select 1 from public.transactions t
      join public.debts d on d.id = t.debt_id
     where t.debt_id = p_debt_id and t.type = 'transfer_in' and d.type = 'debt'
  ) into v_cash_in;

  insert into public.transactions (user_id, pay_period_id, account_id, category_id, type, amount, note, date, debt_id)
  values (auth.uid(), p_pay_period_id, p_account_id,
          case when v_cash_in then null else p_category_id end,
          case when v_cash_in then 'transfer_out' else 'expense' end,
          p_amount, p_note, p_date, p_debt_id)
  returning * into v_tx;

  return public.apply_debt_payment(p_debt_id, p_amount, p_date, p_account_id, v_tx.id);
end;
$$;


-- ---------------------------------------------------------------------------------
-- 6. Closing a period
-- ---------------------------------------------------------------------------------
create or replace function public.pay_periods_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_first date;
  v_last  date;
begin
  if auth.uid() is null then
    return new;
  end if;

  if old.status = 'closed' then
    if new.status <> 'closed'
       or new.start_date <> old.start_date
       or new.end_date is distinct from old.end_date
       or new.closing_balance is distinct from old.closing_balance then
      raise exception 'A closed period can''t be reopened or changed.';
    end if;
    return new;
  end if;

  if new.start_date <> old.start_date then
    select min(date) into v_first from public.transactions where pay_period_id = new.id;
    if v_first < new.start_date then
      raise exception 'This period has transactions from %, so it can''t start after that.', to_char(v_first, 'DD Mon YYYY');
    end if;
  end if;

  if new.status = 'closed' then
    new.end_date := coalesce(new.end_date, current_date);
    select max(date) into v_last from public.transactions where pay_period_id = new.id;
    if v_last > new.end_date then
      raise exception 'This period has transactions up to %, so it can''t close before that.', to_char(v_last, 'DD Mon YYYY');
    end if;
    -- The money across every account at the moment it closes.
    new.closing_balance := (select coalesce(sum(balance), 0) from public.accounts where user_id = new.user_id);
  end if;

  return new;
end;
$$;

drop trigger if exists pay_periods_guard on public.pay_periods;
create trigger pay_periods_guard
  before update on public.pay_periods
  for each row execute function public.pay_periods_guard();


-- Signed-in users only.
revoke execute on function public.create_debt(text, text, numeric, date, text, uuid, boolean, date, uuid) from public, anon;
grant execute on function public.create_debt(text, text, numeric, date, text, uuid, boolean, date, uuid) to authenticated;
revoke execute on function public.pay_debt(uuid, numeric, uuid, date, uuid, uuid, text) from public, anon;
grant execute on function public.pay_debt(uuid, numeric, uuid, date, uuid, uuid, text) to authenticated;
revoke execute on function public.period_summaries(uuid[]) from public, anon;
grant execute on function public.period_summaries(uuid[]) to authenticated;
