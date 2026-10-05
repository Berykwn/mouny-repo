-- Ledger integrity.
--
-- 1. Every change to a balance is a transaction row, so an account's balance always
--    equals its opening balance plus its transactions. Transfers (one row out, one row
--    in, sharing transfer_id), receivable collections and balance adjustments used to
--    move balances with no row at all.
-- 2. Money that only changes hands (transfers, borrowing, lending, collecting, balance
--    adjustments) has its own types, transfer_in and transfer_out, so it no longer
--    counts as income or spending. Debt payments stay expenses: for most debts here
--    (installments, pay-later) they are what the purchase costs.
-- 3. A balance may go below zero through a correction (deleting or lowering income), and
--    the app flags the account as overdrawn; new money out still can't overdraw.
-- 4. A row can only point at the same user's rows (composite foreign keys).
-- 5. Linked records stay in step: deleting a debt payment puts the amount back on the
--    debt, deleting a wish purchase or installment takes it off the wish, and deleting
--    one side of a transfer deletes the other.
-- 6. A closed period's money is fixed, a transaction's date falls inside its period,
--    and periods don't overlap. A transfer between periods belongs to no period.
-- 7. An account with history is archived instead of deleted.
--
-- Runs on a database built from the baseline migrations and on the production database,
-- whose older triggers and constraints were made by hand under other names: those are
-- found and dropped by what they do, not by name. Needs Postgres 15+ (ON DELETE SET NULL
-- with a column list).
--
-- The rules that stop the app from changing data (closed periods, linked transactions)
-- apply to signed-in users only. The SQL editor, service role and seed scripts, which
-- have no auth.uid(), can still correct anything.


-- ---------------------------------------------------------------------------------
-- Old triggers and checks
-- ---------------------------------------------------------------------------------
do $$
declare
  r record;
begin
  -- Every trigger on transactions, the hand-made balance trigger among them. The ones
  -- needed are created again below; leaving an old balance trigger in place would
  -- count every transaction twice.
  for r in
    select tgname from pg_trigger
     where tgrelid = 'public.transactions'::regclass and not tgisinternal
  loop
    execute format('drop trigger %I on public.transactions', r.tgname);
  end loop;

  -- balance >= 0 and initial_balance >= 0.
  for r in
    select conname from pg_constraint
     where conrelid = 'public.accounts'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ~ 'balance'
  loop
    execute format('alter table public.accounts drop constraint %I', r.conname);
  end loop;

  -- type in ('income', 'expense'), replaced below.
  for r in
    select conname from pg_constraint
     where conrelid = 'public.transactions'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ~ '\mtype\M'
  loop
    execute format('alter table public.transactions drop constraint %I', r.conname);
  end loop;
end;
$$;


-- ---------------------------------------------------------------------------------
-- Transaction types and links
-- ---------------------------------------------------------------------------------
alter table public.transactions
  add constraint transactions_type_check
    check (type in ('income', 'expense', 'transfer_in', 'transfer_out')),
  -- Both sides of a transfer between accounts.
  add column if not exists transfer_id uuid,
  -- The debt a payment, collection, loan received or loan given belongs to.
  add column if not exists debt_id uuid,
  -- How much of a quantity wish (e.g. grams) an installment bought.
  add column if not exists wish_quantity numeric check (wish_quantity > 0);

-- A transfer can happen between periods (before the first one, or after closing one and
-- before opening the next); it then belongs to no period. Income and spending always
-- belong to one.
alter table public.transactions
  alter column pay_period_id drop not null,
  add constraint transactions_period_check
    check (pay_period_id is not null or type in ('transfer_in', 'transfer_out'));

create index if not exists transactions_transfer_id_idx on public.transactions (transfer_id) where transfer_id is not null;
create index if not exists transactions_debt_id_idx on public.transactions (debt_id) where debt_id is not null;

create or replace function public.transaction_effect(p_type text, p_amount numeric)
returns numeric
language sql
immutable
as $$
  select case when p_type in ('income', 'transfer_in') then p_amount else -p_amount end
$$;


-- ---------------------------------------------------------------------------------
-- Existing data: debt money out of income and spending
-- ---------------------------------------------------------------------------------

-- Debt payments know their transaction; give the transaction its debt.
update public.transactions t
   set debt_id = dp.debt_id
  from public.debt_payments dp
 where dp.transaction_id = t.id
   and t.debt_id is null;

-- Money lent out was recorded as an expense in the "Receivable" category, and money
-- borrowed as income. Neither is spending or earning.
update public.transactions t
   set type = 'transfer_out', category_id = null
 where t.type = 'expense'
   and (t.note like 'Lent to — %'
        or t.category_id in (select c.id from public.categories c where c.name = 'Receivable' and c.type = 'expense'));

update public.transactions t
   set type = 'transfer_in', category_id = null
 where t.type = 'income'
   and t.note like 'Debt received — %';

-- Link those to their debt where the counterparty's name points to exactly one.
update public.transactions t
   set debt_id = d.id
  from public.debts d
 where t.debt_id is null
   and d.user_id = t.user_id
   and ((t.type = 'transfer_out' and d.type = 'receivable' and t.note = 'Lent to — ' || d.counterparty)
     or (t.type = 'transfer_in' and d.type = 'debt' and t.note = 'Debt received — ' || d.counterparty))
   and (select count(*) from public.debts d2
         where d2.user_id = d.user_id and d2.type = d.type and d2.counterparty = d.counterparty) = 1;

-- Past collections moved a balance with no row. Give each one its row (no balance
-- trigger exists at this point, so the balance doesn't move again), in the period its
-- date falls in.
create temp table _collections on commit drop as
select gen_random_uuid() as tx_id, dp.id as payment_id, dp.user_id, dp.debt_id, dp.amount,
       dp.date, dp.account_id, dp.created_at, d.counterparty,
       (select p.id from public.pay_periods p
         where p.user_id = dp.user_id and p.start_date <= dp.date
         order by p.start_date desc limit 1) as period_id
  from public.debt_payments dp
  join public.debts d on d.id = dp.debt_id
 where dp.transaction_id is null
   and d.type = 'receivable'
   and dp.account_id is not null;

insert into public.transactions (id, user_id, pay_period_id, account_id, type, amount, note, date, debt_id, created_at)
select tx_id, user_id, period_id, account_id, 'transfer_in', amount, 'Collected from — ' || counterparty, date, debt_id, created_at
  from _collections
 where period_id is not null;

update public.debt_payments dp
   set transaction_id = c.tx_id
  from _collections c
 where c.payment_id = dp.id
   and c.period_id is not null;


-- ---------------------------------------------------------------------------------
-- Rows point only at the same user's rows
-- ---------------------------------------------------------------------------------
do $$
declare
  t text;
  r record;
begin
  foreach t in array array['accounts', 'categories', 'pay_periods', 'wish_list', 'transactions', 'debts'] loop
    if not exists (select 1 from pg_constraint where conname = t || '_id_user_id_key') then
      execute format('alter table public.%I add constraint %I unique (id, user_id)', t, t || '_id_user_id_key');
    end if;
  end loop;

  -- The single-column foreign keys these replace, whatever they're called.
  for r in
    select distinct c.conrelid::regclass as tbl, c.conname
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'f'
       and (c.conrelid, a.attname::text) in (
         values ('public.transactions'::regclass, 'pay_period_id'),
                ('public.transactions'::regclass, 'account_id'),
                ('public.transactions'::regclass, 'category_id'),
                ('public.transactions'::regclass, 'wish_list_item_id'),
                ('public.transactions'::regclass, 'debt_id'),
                ('public.category_budgets'::regclass, 'category_id'),
                ('public.pay_periods'::regclass, 'salary_account_id'),
                ('public.wish_list'::regclass, 'pay_period_id'),
                ('public.wish_list'::regclass, 'transaction_id'),
                ('public.debts'::regclass, 'pay_from_account_id'),
                ('public.debt_payments'::regclass, 'debt_id'),
                ('public.debt_payments'::regclass, 'account_id'),
                ('public.debt_payments'::regclass, 'transaction_id'))
  loop
    execute format('alter table %s drop constraint if exists %I', r.tbl, r.conname);
  end loop;
end;
$$;

-- Same names as before: the app's queries embed through some of them.
alter table public.transactions
  add constraint transactions_pay_period_id_fkey
    foreign key (pay_period_id, user_id) references public.pay_periods (id, user_id),
  add constraint transactions_account_id_fkey
    foreign key (account_id, user_id) references public.accounts (id, user_id),
  add constraint transactions_category_id_fkey
    foreign key (category_id, user_id) references public.categories (id, user_id),
  add constraint transactions_wish_list_item_id_fkey
    foreign key (wish_list_item_id, user_id) references public.wish_list (id, user_id) on delete set null (wish_list_item_id),
  add constraint transactions_debt_id_fkey
    foreign key (debt_id, user_id) references public.debts (id, user_id) on delete set null (debt_id);

alter table public.category_budgets
  add constraint category_budgets_category_id_fkey
    foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade;

alter table public.pay_periods
  add constraint pay_periods_salary_account_id_fkey
    foreign key (salary_account_id, user_id) references public.accounts (id, user_id) on delete set null (salary_account_id);

alter table public.wish_list
  add constraint wish_list_pay_period_id_fkey
    foreign key (pay_period_id, user_id) references public.pay_periods (id, user_id),
  add constraint wish_list_transaction_id_fkey
    foreign key (transaction_id, user_id) references public.transactions (id, user_id) on delete set null (transaction_id);

alter table public.debts
  add constraint debts_pay_from_account_id_fkey
    foreign key (pay_from_account_id, user_id) references public.accounts (id, user_id) on delete set null (pay_from_account_id);

-- A payment goes with its transaction: deleting the transaction deletes the payment,
-- which puts the amount back on the debt (debt_payments_apply below).
alter table public.debt_payments
  add constraint debt_payments_debt_id_fkey
    foreign key (debt_id, user_id) references public.debts (id, user_id) on delete cascade,
  add constraint debt_payments_account_id_fkey
    foreign key (account_id, user_id) references public.accounts (id, user_id) on delete set null (account_id),
  add constraint debt_payments_transaction_id_fkey
    foreign key (transaction_id, user_id) references public.transactions (id, user_id) on delete cascade;


-- ---------------------------------------------------------------------------------
-- Debts: remaining amount follows payments, status follows remaining amount
-- ---------------------------------------------------------------------------------
update public.debts set remaining_amount = least(remaining_amount, total_amount) where remaining_amount > total_amount;

alter table public.debts
  add constraint debts_remaining_within_total check (remaining_amount <= total_amount);

create or replace function public.debts_sync_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.status := case when new.remaining_amount = 0 then 'paid' else 'active' end;
  return new;
end;
$$;

drop trigger if exists debts_sync_status on public.debts;
create trigger debts_sync_status
  before insert or update of remaining_amount, status on public.debts
  for each row execute function public.debts_sync_status();

update public.debts set status = status;

create or replace function public.debt_payments_apply()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.debts
       set remaining_amount = greatest(0, remaining_amount - new.amount)
     where id = new.debt_id;
    return new;
  end if;

  update public.debts
     set remaining_amount = least(total_amount, remaining_amount + old.amount)
   where id = old.debt_id;
  return old;
end;
$$;

drop trigger if exists debt_payments_apply on public.debt_payments;
create trigger debt_payments_apply
  after insert or delete on public.debt_payments
  for each row execute function public.debt_payments_apply();


-- ---------------------------------------------------------------------------------
-- Balances
-- ---------------------------------------------------------------------------------

-- The history before this migration has rows missing (transfers, adjustments), so make
-- the opening balance whatever makes today's balance add up. From here on every change
-- is a row.
update public.accounts a
   set initial_balance = a.balance - coalesce(
         (select sum(public.transaction_effect(t.type, t.amount))
            from public.transactions t where t.account_id = a.id), 0);

-- An account that's no longer used but has history is archived instead of deleted: the
-- app hides it, and its money is fixed. Only an empty account can be archived, so hiding
-- it never hides money.
alter table public.accounts add column if not exists archived_at timestamptz;

create or replace function public.accounts_archive_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.archived_at is not null and old.archived_at is null and new.balance <> 0 then
    raise exception 'Move the money out of % before archiving it.', new.name;
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_archive_rules on public.accounts;
create trigger accounts_archive_rules
  before update of archived_at on public.accounts
  for each row execute function public.accounts_archive_rules();

-- A new account starts at its opening balance.
create or replace function public.accounts_opening_balance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.balance := new.initial_balance;
  return new;
end;
$$;

drop trigger if exists accounts_opening_balance on public.accounts;
create trigger accounts_opening_balance
  before insert on public.accounts
  for each row execute function public.accounts_opening_balance();

-- Balances change only through transactions: the app may rename an account, change its
-- type or archive it, nothing else.
revoke update on public.accounts from anon, authenticated;
grant update (name, type, archived_at) on public.accounts to authenticated;

-- Balances follow transactions: an insert applies one, a delete undoes it, an update
-- moves the difference. Runs as the owner because users can't write balances
-- themselves; the composite foreign key guarantees the account is the row owner's.
create or replace function public.transactions_apply_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta   numeric;
  v_balance numeric;
  v_name    text;
begin
  if tg_op = 'DELETE' then
    update public.accounts
       set balance = balance - public.transaction_effect(old.type, old.amount)
     where id = old.account_id;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.account_id <> new.account_id then
    update public.accounts
       set balance = balance - public.transaction_effect(old.type, old.amount)
     where id = old.account_id;
    v_delta := public.transaction_effect(new.type, new.amount);
  elsif tg_op = 'UPDATE' then
    v_delta := public.transaction_effect(new.type, new.amount) - public.transaction_effect(old.type, old.amount);
  else
    v_delta := public.transaction_effect(new.type, new.amount);
  end if;

  update public.accounts
     set balance = balance + v_delta
   where id = new.account_id and user_id = new.user_id
  returning balance, name into v_balance, v_name;
  if not found then
    raise exception 'Account not found';
  end if;

  -- New money out can't overdraw. A correction that lowers a balance (deleting income,
  -- say) may take it below zero; the app then shows the account as overdrawn.
  if tg_op <> 'DELETE' and v_delta < 0 and v_balance < 0 then
    raise exception 'Insufficient balance in %.', v_name using errcode = 'check_violation';
  end if;
  return new;
end;
$$;


-- ---------------------------------------------------------------------------------
-- Transactions: what a user may change
-- ---------------------------------------------------------------------------------
create or replace function public.transactions_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_period   public.pay_periods;
  v_new_period   public.pay_periods;
  v_moves_money  boolean;
  v_linked       public.transactions;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_op <> 'INSERT' then
    select * into v_old_period from public.pay_periods where id = old.pay_period_id;
  end if;
  if tg_op <> 'DELETE' then
    select * into v_new_period from public.pay_periods where id = new.pay_period_id;
  end if;

  v_moves_money := tg_op <> 'UPDATE'
    or old.amount <> new.amount or old.account_id <> new.account_id
    or old.type <> new.type or old.pay_period_id <> new.pay_period_id;

  if v_moves_money and ('closed' in (v_old_period.status, v_new_period.status)) then
    raise exception 'This period is closed, so its money can''t change.';
  end if;

  if v_moves_money and exists (
    select 1 from public.accounts
     where archived_at is not null
       and id in (case when tg_op <> 'INSERT' then old.account_id end,
                  case when tg_op <> 'DELETE' then new.account_id end)
  ) then
    raise exception 'That account is archived. Restore it to change its money.';
  end if;

  -- A linked transaction's money belongs to its transfer, debt or wish.
  if tg_op = 'UPDATE' and v_moves_money then
    v_linked := old;
    if v_linked.transfer_id is not null or v_linked.debt_id is not null or v_linked.wish_list_item_id is not null then
      raise exception 'This transaction belongs to a %. Delete it and record it again instead.',
        case when v_linked.transfer_id is not null then 'transfer'
             when v_linked.debt_id is not null then 'debt'
             else 'wish' end;
    end if;
  end if;

  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and (old.date <> new.date or old.pay_period_id <> new.pay_period_id)) then
    if new.date < v_new_period.start_date
       or (v_new_period.end_date is not null and new.date > v_new_period.end_date) then
      raise exception 'The date has to fall inside its pay period (from %).', to_char(v_new_period.start_date, 'DD Mon YYYY');
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

-- After a delete, the records linked to it follow.
create or replace function public.transactions_after_delete()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_wish public.wish_list;
  v_qty  numeric;
begin
  -- The other side of a transfer.
  if old.transfer_id is not null then
    delete from public.transactions where transfer_id = old.transfer_id and id <> old.id;
  end if;

  -- A wish's purchase or installment. (Its transaction_id link is already cleared by the
  -- foreign key when this runs.)
  if old.wish_list_item_id is not null then
    select * into v_wish from public.wish_list where id = old.wish_list_item_id for update;
    if found and v_wish.quantity is null then
      if v_wish.is_purchased and (v_wish.transaction_id is null or v_wish.transaction_id = old.id) then
        update public.wish_list set is_purchased = false, transaction_id = null where id = v_wish.id;
      end if;
    elsif found then
      v_qty := greatest(0, round(v_wish.saved_quantity - coalesce(old.wish_quantity, 0), 3));
      update public.wish_list
         set saved_quantity = v_qty,
             saved_amount   = greatest(0, saved_amount - old.amount),
             is_purchased   = v_qty >= round(quantity, 3),
             transaction_id = case when v_qty >= round(quantity, 3) then transaction_id end
       where id = v_wish.id;
    end if;
  end if;

  return old;
end;
$$;

create trigger transactions_guard
  before insert or update or delete on public.transactions
  for each row execute function public.transactions_guard();

create trigger transactions_apply_balance
  after insert or delete or update of account_id, type, amount on public.transactions
  for each row execute function public.transactions_apply_balance();

create trigger transactions_after_delete
  after delete on public.transactions
  for each row execute function public.transactions_after_delete();


-- ---------------------------------------------------------------------------------
-- Periods don't overlap
-- ---------------------------------------------------------------------------------

-- A period covers its start date up to, not including, its end date, so the next one
-- may start on the day the last one closed. A closed period with no end date (older
-- rows) covers nothing.
create or replace function public.pay_periods_no_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.pay_periods o
     where o.user_id = new.user_id and o.id <> new.id
       and daterange(o.start_date, case when o.status = 'active' then null else coalesce(o.end_date, o.start_date) end, '[)')
        && daterange(new.start_date, case when new.status = 'active' then null else coalesce(new.end_date, new.start_date) end, '[)')
  ) then
    raise exception 'This period overlaps another one. A new period starts on or after the day the last one ended.';
  end if;
  return new;
end;
$$;

drop trigger if exists pay_periods_no_overlap on public.pay_periods;
create trigger pay_periods_no_overlap
  before insert or update of start_date, end_date, status on public.pay_periods
  for each row execute function public.pay_periods_no_overlap();


-- ---------------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------------

-- The period a transfer on this date belongs to: the active one, if it has started by
-- then. Otherwise none — the transfer happened between periods, and a closed period
-- never takes new money.
create or replace function public.period_for_date(p_date date)
returns uuid
language sql
stable
set search_path = public
as $$
  select id
    from public.pay_periods
   where user_id = auth.uid() and status = 'active' and start_date <= p_date
$$;

-- Move money between two accounts: a transfer_out and a transfer_in sharing one
-- transfer_id. Neither counts as income or spending.
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'transfer_balance'
  loop
    execute format('drop function %s', f);
  end loop;
end;
$$;

create function public.transfer_balance(
  p_from_id uuid,
  p_to_id   uuid,
  p_amount  numeric,
  p_date    date default null
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_date   date := coalesce(p_date, current_date);
  v_from   text;
  v_to     text;
  v_period uuid;
  v_id     uuid := gen_random_uuid();
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;
  if p_from_id = p_to_id then
    raise exception 'Choose two different accounts.';
  end if;

  select name into v_from from public.accounts where id = p_from_id;
  if not found then raise exception 'Account not found'; end if;
  select name into v_to from public.accounts where id = p_to_id;
  if not found then raise exception 'Account not found'; end if;

  v_period := public.period_for_date(v_date);

  insert into public.transactions (user_id, pay_period_id, account_id, type, amount, note, date, transfer_id)
  values (auth.uid(), v_period, p_from_id, 'transfer_out', p_amount, 'Transfer to ' || v_to, v_date, v_id),
         (auth.uid(), v_period, p_to_id, 'transfer_in', p_amount, 'Transfer from ' || v_from, v_date, v_id);

  return v_id;
end;
$$;

-- Correct an account's balance by a signed amount: a transfer_in or transfer_out row
-- noted "Balance adjustment", in the active period if there is one.
create or replace function public.adjust_balance(
  p_account_id uuid,
  p_amount     numeric,
  p_date       date default null
) returns public.accounts
language plpgsql
set search_path = public
as $$
declare
  v_account public.accounts;
  v_date    date := coalesce(p_date, current_date);
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'Enter an amount other than zero.';
  end if;

  perform 1 from public.accounts where id = p_account_id;
  if not found then
    raise exception 'Account not found';
  end if;

  insert into public.transactions (user_id, pay_period_id, account_id, type, amount, note, date)
  values (auth.uid(), public.period_for_date(v_date), p_account_id,
          case when p_amount > 0 then 'transfer_in' else 'transfer_out' end,
          abs(p_amount), 'Balance adjustment', v_date);

  select * into v_account from public.accounts where id = p_account_id;
  return v_account;
end;
$$;

-- Change a transaction's amount, account, type or details. An update: the balance
-- trigger moves the difference, and links (wish, debt, transfer) stay as they are.
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
  v_new public.transactions;
begin
  if p_type not in ('income', 'expense') then
    raise exception 'Only income and expenses can be edited this way.';
  end if;

  update public.transactions
     set pay_period_id = p_pay_period_id, account_id = p_account_id, category_id = p_category_id,
         type = p_type, amount = p_amount, note = p_note, date = p_date
   where id = p_id
  returning * into v_new;

  if not found then
    raise exception 'Transaction not found';
  end if;
  return v_new;
end;
$$;

-- Log a payment on a debt; the debt_payments trigger lowers what's left. Locks the debt
-- so two payments at once can't both pass the "not more than what's left" check.
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
  if p_amount > v_debt.remaining_amount then
    raise exception 'That''s more than what''s left on this debt.';
  end if;

  insert into public.debt_payments (user_id, debt_id, amount, date, account_id, transaction_id)
  values (v_debt.user_id, p_debt_id, p_amount, p_date, p_account_id, p_transaction_id);

  select * into v_debt from public.debts where id = p_debt_id;
  return v_debt;
end;
$$;

-- Pay a debt from an account: an expense linked to the debt, and the payment.
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
  insert into public.transactions (user_id, pay_period_id, account_id, category_id, type, amount, note, date, debt_id)
  values (auth.uid(), p_pay_period_id, p_account_id, p_category_id, 'expense', p_amount, p_note, p_date, p_debt_id)
  returning * into v_tx;

  return public.apply_debt_payment(p_debt_id, p_amount, p_date, p_account_id, v_tx.id);
end;
$$;

-- Collect on a receivable into an account: a transfer_in linked to the debt (getting
-- your own money back isn't income), and the payment.
create or replace function public.collect_receivable(
  p_debt_id    uuid,
  p_amount     numeric,
  p_account_id uuid,
  p_date       date
) returns public.debts
language plpgsql
set search_path = public
as $$
declare
  v_debt public.debts;
  v_tx   public.transactions;
begin
  select * into v_debt from public.debts where id = p_debt_id;
  if not found then
    raise exception 'Debt not found';
  end if;

  insert into public.transactions (user_id, pay_period_id, account_id, type, amount, note, date, debt_id)
  values (auth.uid(), public.period_for_date(p_date), p_account_id, 'transfer_in', p_amount,
          'Collected from — ' || v_debt.counterparty, p_date, p_debt_id)
  returning * into v_tx;

  return public.apply_debt_payment(p_debt_id, p_amount, p_date, p_account_id, v_tx.id);
end;
$$;

-- Put an installment toward a quantity wish: the expense (with how much it bought, so
-- deleting it can take that back off) and the wish's progress together.
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

  insert into public.transactions (user_id, pay_period_id, account_id, category_id, type, amount, note, date, wish_list_item_id, wish_quantity)
  values (auth.uid(), p_pay_period_id, p_account_id, p_category_id, 'expense', p_amount, p_note, p_date, p_wish_id, round(p_quantity, 3))
  returning * into v_tx;

  update public.wish_list
     set saved_quantity = v_saved,
         saved_amount   = coalesce(saved_amount, 0) + p_amount,
         is_purchased   = v_complete,
         transaction_id = case when v_complete then v_tx.id else transaction_id end
   where id = p_wish_id
  returning * into v_item;

  return v_item;
end;
$$;

-- Signed-in users only.
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
         'period_for_date', 'transfer_balance', 'adjust_balance', 'replace_transaction',
         'apply_debt_payment', 'pay_debt', 'collect_receivable', 'contribute_wish_quantity'
       )
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
